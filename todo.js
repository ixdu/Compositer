//some ideas about the video surfaces in particular and surfaces in common case

var fsurface = comp.flash_surface_create();

var vsurface = comp.video_surface_create();

var video = modules.video.create();

video.source = cloud_object.link();

video.display_to(vsurface);
video.display_to(fsurface);
video.play;

var csurface = comp.canvas_surface_create();
