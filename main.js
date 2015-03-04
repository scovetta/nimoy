/**
 * Listens for the app launching then creates the window
 *
 * @see http://developer.chrome.com/apps/app.runtime.html
 * @see http://developer.chrome.com/apps/app.window.html
 */
chrome.app.runtime.onLaunched.addListener(function() {
  // Center window on screen.
  var screenWidth = screen.availWidth;
  var screenHeight = screen.availHeight;
  var width = 1230;
  var height = 680;

  chrome.app.window.create('index.html', {
    id: "helloWorldID",
    frame: "none",
    outerBounds: {
      width: width,
      minWidth: width,
      minHeight: height,
      height: height,
      left: Math.round((screenWidth-width)/2),
      top: Math.round((screenHeight-height)/2),
    }
  });
});