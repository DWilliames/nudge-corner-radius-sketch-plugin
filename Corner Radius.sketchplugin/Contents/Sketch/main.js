
var selection
var doc
var smallNudge // Based on the user's settings — typical 'move' amount
var largeNudge // Based on the user's settings — typical 'shift + move' amount
var radiusSeparator // Used for separating a specific radius to each corner

// Setup variables based on the context
function setup(context) {
  doc = context.document
  selection = context.selection
  // Get the values from the 'User Defaults'
  // Visible at '~/Library/Preferences/com.bohemiancoding.sketch3.plist'
  smallNudge = NSUserDefaults.standardUserDefaults().integerForKey('nudgeDistanceSmall')
  largeNudge = NSUserDefaults.standardUserDefaults().integerForKey('nudgeDistanceBig')

  // Set the separator based on the Sketch version
  radiusSeparator = (sketchVersionNumber() < 420) ? '/' : ';'
}


// ****************************
//   Plugin command handlers
// ****************************

function increaseRadius(context) {
  setup(context)
  updateRadius(smallNudge, "Align right")
}

function decreaseRadius(context) {
  setup(context)
  updateRadius(-smallNudge, "Align left")
}

function increaseRadiusLarge(context) {
  setup(context)
  updateRadius(largeNudge, "Show Next Tab")
}

function decreaseRadiusLarge(context) {
  setup(context)
  updateRadius(-largeNudge, "Show Previous Tab")
}


// ****************************
//   Helper functions
// ****************************


// Update the radius by 'change'
function updateRadius(change, alternateMenuItem) {
  if (validSelection()) {
    changeCornerRadius(change)
  } else {
    // If the selection is not valid — perform the fallback menu item
    performMenuItem(alternateMenuItem)
  }
}

// Is the selection valid?
// Yes, if every selected layer is a Shape or ShapePath
function validSelection() {
  return selection.count() > 0 && selection.every(layer => {
    return layer.isKindOfClass(MSShapeGroup) || layer.isKindOfClass(MSShapePathLayer)
  })
}

// Perform the Menu Item — based on it's name
function performMenuItem(menuName) {
  // Update the menu before we look through it
  var menu = NSApplication.sharedApplication().mainMenu()
  menu.update()

  var menuItems = NSApplication.sharedApplication().mainMenu().itemArray()
  // Look through each of the mainMeny items — we won't check if these match yet
  menuItems.forEach(item => {
    item.menu().update()
    item.submenu().itemArray().some(subItem => {
      // For each submenu within that, if it's a match, perform it's action end finish
      if (subItem.title().toLowerCase() == menuName.toLowerCase()) {
        NSApp.sendAction_to_from(subItem.action(), subItem.target(), subItem)
        return true
      }
    })
  })
}

// Return the version number for sketch — turned into a single integer
// e.g. '3.8.5' => 385, '40.2' => 402
function sketchVersionNumber() {
  var version = NSBundle.mainBundle().objectForInfoDictionaryKey("CFBundleShortVersionString")
  var versionNumber = version.stringByReplacingOccurrencesOfString_withString(".", "") + ""
  while(versionNumber.length != 3) {
    versionNumber += "0"
  }
  return parseInt(versionNumber)
}


/*
 * Will change the corner radius of either:
 *    - the selected layers (if they are rectangles); or...
 *    - the selcted curve points, when a shape is being edited
 * Where 'change' is how much to offset the current corner radius
 */
function changeCornerRadius(change) {
  // Update the corner radius for each selected element
  selection.forEach(layer => {

    var handler = doc.eventHandlerManager().currentHandler()

    // Offset the corners on the layer, if we're selecting it, and not editing it
    if (handler.isKindOfClass(MSNormalEventHandler)) {
      // If before Sketch 52 – check the shape layers of the selection
      // If Sketch 52+, the user may be selecting the Rectangle shape directly
      if (sketchVersionNumber() < 520) {
        if (layer.isKindOfClass(MSShapeGroup)) {
          layer.layers().forEach(shape => {
            offsetCornerRadiusForLayer(change, shape)
          })
        }
      } else {
        offsetCornerRadiusForLayer(change, layer)
      }
    } else if (handler.isKindOfClass(MSShapeEventHandler) && layer.isKindOfClass(MSShapePathLayer)) {
      // If the shape is being edited — update based on the selected points
      handler.pathController().selectedObjects().forEach(point => {
        if (point.isKindOfClass(MSCurvePoint) && point.currentBehaviour() == MSCurvePointStraightBehaviour) {
          var newRadius = Math.max(point.cornerRadius() + change, 0) // Minimum value is '0'
          point.setCornerRadius(newRadius)
        }
      })
    }
  })

  // Refresh the inspector so that the radius text field is up to date
  doc.reloadInspector()
}


function offsetCornerRadiusForLayer(offset, layer) {
  // Can only do it if the layer is a Rectangle
  if (!layer.isKindOfClass(MSRectangleShape)) {
    return
  }

  // An array of each corner radius
  var radii = layer.cornerRadiusString().split(radiusSeparator)
  // Update each radius by the change amount
  radii = radii.map(radius => {
    var newRadius = parseFloat(radius) + offset
    return Math.max(newRadius, 0) // Minimum value is '0'
  })

  // Set the radius by setting the string, separated by ';'
  layer.setCornerRadiusFromComponents(radii.join(radiusSeparator))
}
