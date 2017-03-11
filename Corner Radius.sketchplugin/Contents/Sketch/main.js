
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

function updateRadius(change, alternateMenuItem) {
  if (validSelection()) {
    changeCornerRadius(change)
  } else {
    performMenuItem(alternateMenuItem)
  }
}

function validSelection() {
  return selection.count() > 0 && selection.every(layer => {
    return layer.isKindOfClass(MSShapeGroup) || layer.isKindOfClass(MSShapePathLayer)
  })
}

function performMenuItem(menuName) {
  var menu = NSApplication.sharedApplication().mainMenu()
  menu.update()

  var menuItems = NSApplication.sharedApplication().mainMenu().itemArray()
  menuItems.forEach(item => {
    item.menu().update()
    item.submenu().itemArray().some(subItem => {
      if (subItem.title().toLowerCase() == menuName.toLowerCase()) {
        NSApp.sendAction_to_from(subItem.action(), subItem.target(), subItem)
        return true
      }
    })
  })
}

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
    if (layer.isKindOfClass(MSShapeGroup)) {
      layer.layers().forEach(shape => {
        // Update the corner radius if it's a rectangle shape
        if(shape.isKindOfClass(MSRectangleShape)) {

          // An array of each corner radius
          var radii = shape.cornerRadiusString().split(radiusSeparator)
          // Update each radius by the change amount
          radii = radii.map(radius => {
            var newRadius = parseFloat(radius) + change
            return Math.max(newRadius, 0) // Minimum value is '0'
          })

          // Set the radius by setting the string, separated by ';'
          shape.setCornerRadiusFromComponents(radii.join(radiusSeparator))
        }
      })
    }

    // If the shape is being edited — update based on the selected points
    var handler = doc.eventHandlerManager().currentHandler()
    if (layer.isKindOfClass(MSShapePathLayer) && handler.isKindOfClass(MSShapeEventHandler)) {
      var points = layer.path().points()
      // Update the radius for each of the selected point's
      handler.indexPathsForSelectedHandles().forEach(indexPath => {
        var point = points[indexPath.item()]
        // Only update the point's radius, if it is a 'straight' curve point
        if (point.currentBehaviour() == MSCurvePointStraightBehaviour) {
          var newRadius = Math.max(point.cornerRadius() + change, 0) // Minimum value is '0'
          point.setCornerRadius(newRadius)
        }
      })
    }
  })

  // Refresh the inspector so that the radius text field is up to date
  doc.reloadInspector()
}
