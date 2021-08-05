  
function calcPixel(x, y, iterations, factor) {
  var i;
  var a = 0, b = 0;
  for (i = 0; i < iterations; ++i) {
      var dx = a * a - b * b + x;
      var dy = factor * a * b + y;
      if (dx * dx + dy * dy > 4)
        break;
      a = dx; b = dy;
  }
  
  return i / iterations;
}

function renderPatch(ctx, sx, sy, sw, sh, dw, dh, data, tx, ty, iterations, factor, palette, paletteOffset) {
  for (var y = 0; y < data.height; ++y) {
    for (var x = 0; x < data.width; ++x) {
      var p = calcPixel(sx + (sw/dw) * (x + tx), sy + (sh/dh) * (y + ty), iterations, factor);
      var index = (y * data.width + x) * 4;
      var paletteIndex = Math.floor(p * (palette.length - 1));
      if (paletteIndex < palette.length - 1)
        paletteIndex = (paletteIndex + paletteOffset) % (palette.length - 1);
      var colour = palette[paletteIndex];
      data.data[index] = colour.r;
      data.data[index+1] = colour.g;
      data.data[index+2] = colour.b;
      data.data[index+3] = 255;
    }
  }
}

var canvas = null;
var renderTimeoutId = 0;
var epoch = 0;
var width, height, sx, sy, sw, sh, tx, ty, tw, th, iterations, factor, resolution, paletteOffset;
function renderPatchTimeout() {
    if (!canvas || canvas.width != tw || canvas.height != th)
      canvas = new OffscreenCanvas(tw, th);
      
    var ctx = canvas.getContext("2d");
    var imageData = ctx.createImageData(canvas.width, canvas.height);
    renderPatch(ctx, sx, sy, sw, sh, width, height, imageData, tx, ty, iterations, factor, palette, paletteOffset);
    ctx.putImageData(imageData, 0, 0);
    
    var image = canvas.transferToImageBitmap();
    self.postMessage({ "message": "renderComplete", "image": image, "sx": sx, "sy": sy, "sw": sw, "sh": sh, "tx": tx, "ty": ty, "tw": tw, "th": th, "width": width, "height": height, "resolution": resolution, "epoch": epoch }, [image]);
    
    renderTimeoutId = 0;
}

var palette = [];
self.onmessage = function(e) {
  switch (e.data.message) {
  case "init":
    console.log("Worker initialising");
    try {
      var hasOffscreenCanvas = new OffscreenCanvas(1, 1);
      hasOffscreenCanvas.getContext("2d");
      hasOffscreenCanvas.transferToImageBitmap();
      self.postMessage({ "message": "ready" });
    } catch(e) {
      console.error(e);
      self.postMessage({ "message": "error" });
    }
    break;
  
  case "setPalette":
    palette = e.data.palette;
    break;
    
  case "renderPatch":
    if (e.data.epoch >= epoch) {
      sx = e.data.sx;
      sy = e.data.sy;
      sw = e.data.sw;
      sh = e.data.sh;
      iterations = e.data.iterations;
      factor = e.data.factor;
      paletteOffset = e.data.paletteOffset;
      tx = e.data.tx;
      ty = e.data.ty;
      tw = e.data.tw;
      th = e.data.th;
      width = e.data.width;
      height = e.data.height;
      resolution = e.data.resolution;
      epoch = e.data.epoch;
      
      // XXX Earlier versions could send multiple jobs, but the current version waits for completion
      //if (!renderTimeoutId)
      //  renderTimeoutId = setTimeout(renderPatchTimeout, 0);
      renderPatchTimeout();
    }
    break;
    
  case "close":
    console.log("Worker closing");
    self.close();
    break;
  }
}
