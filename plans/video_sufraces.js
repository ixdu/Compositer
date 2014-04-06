//some ideas about the video surfaces in particular and surfaces in common case

var fsurface = require('modules/ui/native/flash_surface.js').create(comp);

var vsurface = require('modules/ui/native/video_surface.js').create(comp);

var video = modules.ui.video.create();

video.source = storage.href(object);

video.display_to(vsurface);
video.display_to(fsurface);
video.play();

//var csurface = comp.canvas_surface_create();
