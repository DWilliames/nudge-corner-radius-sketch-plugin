
var selection
var doc

var smallNudge
var largeNudge

function setup(context) {
  doc = context.document
  selection = context.selection

  smallNudge = NSUserDefaults.standardUserDefaults().integerForKey('nudgeDistanceSmall')
  largeNudge = NSUserDefaults.standardUserDefaults().integerForKey('nudgeDistanceBig')
}

function increaseVertically(context) {
  setup(context)
  changeSize(0, smallNudge)
}

function decreaseVertically(context) {
  setup(context)
  changeSize(0, -smallNudge)
}

function increaseVerticallyLarge(context) {
  setup(context)
  changeSize(0, largeNudge)
}

function decreaseVerticallyLarge(context) {
  setup(context)
  changeSize(0, -largeNudge)
}

function increaseHorizontally(context) {
  setup(context)
  changeSize(smallNudge, 0)
}

function decreaseHorizontally(context) {
  setup(context)
  changeSize(-smallNudge, 0)
}

function increaseHorizontallyLarge(context) {
  setup(context)
  changeSize(largeNudge, 0)
}

function decreaseHorizontallyLarge(context) {
  setup(context)
  changeSize(-largeNudge, 0)
}


function changeSize(x, y) {
  selection.forEach(layer => {
    layer.setConstrainProportions(false)

    var frame = layer.frame()
    frame.setX(frame.x() - x)
    frame.setY(frame.y() - y)
    frame.setWidth(frame.width() + 2 * x)
    frame.setHeight(frame.height() + 2 * y)
  })

  doc.reloadInspector()
}


// ****************************
//   Plugin command handlers
// ****************************

function increaseRadius(context) {
  setup(context)
  changeCornerRadius(smallNudge)
}

function decreaseRadius(context) {
  setup(context)
  changeCornerRadius(-smallNudge)
}

function increaseRadiusLarge(context) {
  setup(context)
  changeCornerRadius(largeNudge)
}

function decreaseRadiusLarge(context) {
  setup(context)
  changeCornerRadius(-largeNudge)
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
          var radii = shape.cornerRadiusString().split(';')
          // Update each radius by the change amount
          radii = radii.map(radius => {
            var newRadius = parseInt(radius) + change
            return Math.max(newRadius, 0) // Minimum value is '0'
          })

          // Set the radius by setting the string, separated by ';'
          shape.setCornerRadiusFromComponents(radii.join(';'))
        }
      })
    }

    // If the shape is being edited — update based on the selected points
    var handler = doc.eventHandlerManager().currentHandler()
    if (layer.isKindOfClass(MSShapePathLayer) && handler.isKindOfClass(MSShapeEventHandler)) {

      var points = layer.path().points()
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
