////////////////////////////////////////////////////////////////////////////////
/////////////////////////////// ENGINE VARIABLES ///////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var canvasInfo = {
	id: "canvas01",
	width: 480,
	height: 320
};
var canvas, context;
var frameSpeed = 1 / 60;
var last, now, dt = 0;
var spritesHaveLoaded = true;
var sprites = {};

//this would need to add layers at some point.  for now, no worries.
var drawables = [];
var updatables = [];

////////////////////////////////////////////////////////////////////////////////
////////////////////////// ALL OF THOSE OTHER OBJECTS //////////////////////////
////////////////////////////////////////////////////////////////////////////////
function Vec2(x, y) {
	if(arguments.length === 0) {
		x = 0;
		y = 0;
	}

	var that = {};
	that.x = x;
	that.y = y;
	that.sqrMagnitude = function() {
		return utils.strip(that.x * that.x + that.y * that.y);
	};
	that.magnitude = function() {
		return Math.sqrt(that.sqrMagnitude());
	};
	that.normalized = function() {
		var mag = that.magnitude();
		return Vec2(that.x / mag, that.y / mag);
	};
	that.makeNormal = function() {
		var mag = that.magnitude();
		that.x /= mag;
		that.y /= mag;
	};

	return that;
}

vec2utils = {
	dot: function(vecA, vecB) {
		return utils.strip(vecA.x * vecB.x + vecA.y * vecB.y);
	},
	angle: function(vecA, vecB) {
		var dotProduct = vec2utils.dot(vecA, vecB);
		return Math.acos(utils.strip(dotProduct / (vecA.magnitude() * vecB.magnitude())));
	},
	distance: function(vecA, vecB) {
		var vec = Vec2(vecB.x - vecA.x, vecB.y - vecB.y);
		return vec.magnitude();
	},
	lerp: function(vecA, vecB, t) {
		t = utils.clamp(t, 0, 1);
		var newX = utils.strip(t * (vecB.x - vecA.x) / 2);
		var newY = vecA.y + (vecB.y - vecA.y) * (newX - vecA.x) / (vecB.x - vecA.x);
		return Vec2(newX, newY);
	}
};

function Sprite(image, numSubImages, subImageWidth, subImageHeight) {
	var that = {};
	that.image = image;
	that.width = image.nativeWidth;
	that.height = image.nativeHeight;
	that.numSubImages = numSubImages;
	that.subImageWidth = subImageWidth;
	that.subImageHeight = subImageHeight;
	return that;
}

function SpriteResource(name, resLocation, numSubImages, subImageWidth, subImageHeight) {
	var that = {};
	that.name = name;
	that.resLocation = resLocation;
	that.numSubImages = Math.max(1, numSubImages);
	that.subImageWidth = Math.max(1, subImageWidth);
	that.subImageHeight = Math.max(1, subImageHeight);
	return that;
}

function loadSprites(spriteResourcesArray, callback) {
	var sprites = {};
	var loadedSprites = 0;
	var numSprites = spriteResourcesArray.length;
	spriteResourcesArray.forEach(function(res) {
		var img = new Image();
		img.src = res.resLocation;
		img.onload = function() {
			sprites[res.name] = Sprite(img, res.numSubImages, res.subImageWidth, res.subImageHeight);
			if(++loadedSprites >= numSprites) {
				callback(sprites);
			}
		};
		img.onerror = function() {
			console.log("Unable to load the image at " + res.resLocation +
							". Sprite named " + res.name + " not created.");
			loadedSprites++;
		};
	});
}

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// COMPONENTS //////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function Transformation() {
	var that = {};
	that.position = Vec2(0, 0);
	that.rotation = 0;
	that.scale = Vec2(1, 1);
	return that;
}

function Drawer(ctx) {
	var that = {};
	if(ctx) {
		that.context = ctx;
	} else {
		that.context = null;
	}
	that.draw = function() {
		//draw something
		//maybe throw error for this?
	};
	drawables.push(that);
	return that;
}

function SpriteDrawer(ctx) {
	var that = Drawer(ctx);
	that.imageSpeed = 0; //per second speed
	that.curSubIndex = 0;
	that.loop = true;
	that.sprite = null;
	that.setSprite = function(sprite) {
		that.sprite = sprite;
	};
	that.draw = function() {
		if(that.gameObject &&
			that.context &&
			that.sprite) {
			//draws as if the position is the CENTER of the sprite
			//I don't know if this is good, bad, or neither.  I should probably
			//have an option for it at some point.
			var pos = that.gameObject.transfom.position;
			that.context.drawImage(that.sprite.image,
									that.curSubIndex * that.sprite.subImageWidth,
									0,
									that.sprite.subImageWidth,
									that.sprite.subImageHeight,
									pos.x - that.sprite.subImageWidth / 2,
									pos.y - that.sprite.subImageHeight / 2,
									that.sprite.subImageWidth,
									that.sprite.subImageHeight);
		}
	};
	that.updateSprite = function(dt) {
		that.curSubIndex = Math.floor(that.imageSpeed * dt);
		if(that.sprite && that.curSubIndex > that.sprite.numSubImages) {
			if(that.loop) {
				that.curSubIndex = 0;
			} else {
				that.curSubIndex -= 1;
			}
		}
	};
}

function GameObject() {
	var that = {};
	var components = {
		transfom: Transformation,
		drawer: Drawer,
		spriteDrawer: SpriteDrawer
	};
	that.isActive = true;
	that.transfom = Transformation();
	that.addComponent = function(componentName) {
		if(typeof components[componentName] !== 'undefined' &&
			typeof components[componentName] === 'undefined') {
			that[componentName] = components[componentName]();
			that[componentName].gameObject = that;
			return that[componentName];
		}

		if(typeof components[componentName] !== 'undefined') {
			return that[componentName];
		}
	}
	that.update = null;
	that.push(updatables);
	return that;
}

////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// THE LOOP ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
var timer = function() {
	if(window.performance && window.performance.now) {
		return window.performance.now;
	}
	
	(new Date()).now;
};

window.requestAnimationFrame = function() {
	return window.requestAnimationFrame ||
			window.mozRequestAnimationFrame ||
			window.webkitRequestAnimationFrame ||
			function(callback) {
				window.setTimeout(callback, 1000 * frameSpeed);
			};
};

function initCanvas() {
	canvas = document.createElement("canvas");
	canvas.id = canvasInfo.id;
	canvas.width = canvasInfo.width;
	canvas.height = canvasInfo.height;
	context = canvas.getContext("2d");
	document.body.appendChild(canvas);
}

function mainUpdate(dt) {
	while(dt >= frameSpeed) {
		dt -= frameSpeed;
		updatables.forEach(function(ele) {
			if(ele.isActive && ele.update) {
				ele.update(dt);
			}
		});
	}
}

function mainDraw() {
	drawables.forEach(function(ele) {
		if(ele.isActive && ele.draw) {
			ele.draw();
		}
	});
}

function frame() {
	now = timer();
	dt += (now - last) / 1000;
	mainUpdate(dt);
	mainDraw();
	last = now;
	window.requestAnimationFrame(frame);
}

function initEngine() {	
	initCanvas();
	if(spriteResources) {
		loadSprites(spriteResources, function(loadedSprites) {
			sprites = loadedSprites;
			spritesHaveLoaded = true;
		});
	}
	last = timer();
	//other stuff to initialize
	requestAnimationFrame(frame);
	console.log("Engine intialized");
}