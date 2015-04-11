var engine = function() {
	var eng = {};
	////////////////////////////////////////////////////////////////////////////
	///////////////////////////// ENGINE VARIABLES /////////////////////////////
	////////////////////////////////////////////////////////////////////////////
	eng.canvasInfo = {
		id: "canvas01",
		width: 480,
		height: 320
	};
	eng.canvas = null;
	eng.context = null;
	eng.frameSpeed = 1 / 60;
	eng.last = null;
	eng.now = null;
	eng.dt = null;
	eng.spritesHaveLoaded = true;
	eng.sprites = {};

	//this would need to add layers at some point.  for now, no worries.
	eng.drawables = [];
	eng.updatables = [];

	//array for functions to call when engine has completed initializtion
	eng.oninit = [];

	////////////////////////////////////////////////////////////////////////////
	//////////////////////// ALL OF THOSE OTHER OBJECTS ////////////////////////
	////////////////////////////////////////////////////////////////////////////
	eng.hasCollided = function(goA, wA, hA, goB, wB, hB) {
		var posA = goA.transform.position;
		var posB = goB.transform.position;
		return posA.x < posB.x + wB &&
				posA.x + wA > posB.x &&
				posA.y < posB.y + hB &&
				posA.y + hA > posB.y;
	};

	eng.input = function() {
		var that = {};
		that.keysdown = {};
		window.addEventListener("keydown", function(e) {
			that.keysdown[e.keyCode] = true;
		});

		window.addEventListener("keyup", function(e) {
			delete that.keysdown[e.keyCode];
		});
		return that;
	}();

	eng.Vec2 = function(x, y) {
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
			return eng.Vec2(that.x / mag, that.y / mag);
		};
		that.makeNormal = function() {
			var mag = that.magnitude();
			that.x /= mag;
			that.y /= mag;
		};

		return that;
	};

	eng.vec2utils = {
		dot: function(vecA, vecB) {
			return utils.strip(vecA.x * vecB.x + vecA.y * vecB.y);
		},
		angle: function(vecA, vecB) {
			var dotProduct = eng.vec2utils.dot(vecA, vecB);
			return Math.acos(utils.strip(dotProduct / (vecA.magnitude() * vecB.magnitude())));
		},
		distance: function(vecA, vecB) {
			var vec = eng.Vec2(vecB.x - vecA.x, vecB.y - vecB.y);
			return vec.magnitude();
		},
		lerp: function(vecA, vecB, t) {
			t = utils.clamp(t, 0, 1);
			var newX = utils.strip(t * (vecB.x - vecA.x) / 2);
			var newY = vecA.y + (vecB.y - vecA.y) * (newX - vecA.x) / (vecB.x - vecA.x);
			return eng.Vec2(newX, newY);
		}
	};

	eng.Sprite = function(image, numSubImages, subImageWidth, subImageHeight) {
		var that = {};
		that.image = image;
		that.width = image.naturalWidth;
		that.height = image.naturalHeight;
		that.numSubImages = numSubImages;
		that.subImageWidth = subImageWidth;
		that.subImageHeight = subImageHeight;
		return that;
	};

	eng.SpriteResource = function(name, resLocation, numSubImages, subImageWidth, subImageHeight) {
		var that = {};
		that.name = name;
		that.resLocation = resLocation;
		that.numSubImages = Math.max(1, numSubImages);
		that.subImageWidth = Math.max(1, subImageWidth);
		that.subImageHeight = Math.max(1, subImageHeight);
		return that;
	};

	eng.loadSprites = function(spriteResourcesArray, callback) {
		var sprites = {};
		var loadedSprites = 0;
		var numSprites = spriteResourcesArray.length;
		spriteResourcesArray.forEach(function(res) {
			var img = new Image();
			img.src = res.resLocation;
			img.onload = function() {
				sprites[res.name] = eng.Sprite(img, res.numSubImages, res.subImageWidth, res.subImageHeight);
				if(++loadedSprites >= numSprites) {
					console.log("All sprites loaded");
					callback(sprites);
				}
			};
			img.onerror = function() {
				console.log("Unable to load the image at " + res.resLocation +
								". Sprite named " + res.name + " not created.");
				loadedSprites++;
			};
		});
	};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// COMPONENTS //////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
	eng.Transformation = function() {
		var that = {};
		that.position = eng.Vec2(0, 0);
		that.rotation = 0;
		that.scale = eng.Vec2(1, 1);
		return that;
	};

	eng.Drawer = function(ctx) {
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
		eng.drawables.push(that);
		return that;
	};

	eng.SpriteDrawer = function(ctx) {
		var that = eng.Drawer(ctx);
		that.imageSpeed = 0; //per second speed
		that.curSubIndex = 0;
		that.loop = true;
		that.sprite = null;
		that.draw = function() {
			if(that.gameObject &&
				that.context &&
				that.sprite) {
				//draws as if the position is the TOP LEFT of the sprite
				//I don't know if this is good, bad, or neither.  I should probably
				//have an option for it at some point.
				var pos = that.gameObject.transform.position;
				that.context.drawImage(that.sprite.image,
										that.curSubIndex * that.sprite.subImageWidth,
										0,
										that.sprite.subImageWidth,
										that.sprite.subImageHeight,
										pos.x,
										pos.y,
										that.sprite.subImageWidth * that.gameObject.transform.scale.x,
										that.sprite.subImageHeight * that.gameObject.transform.scale.y);
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
		return that;
	};

	eng.GameObject = function() {
		var that = {};
		var components = {
			transform: eng.Transformation,
			drawer: eng.Drawer,
			spriteDrawer: eng.SpriteDrawer
		};
		that.isActive = true;
		that.transform = eng.Transformation();
		that.addComponent = function(componentName) {
			if(typeof components[componentName] !== 'undefined' &&
				typeof that[componentName] === 'undefined') {
				that[componentName] = components[componentName]();
				that[componentName].gameObject = that;
				return that[componentName];
			}

			if(typeof that[componentName] !== 'undefined') {
				return that[componentName];
			}

			return null;
		};
		that.update = null;
		eng.updatables.push(that);
		return that;
	};

////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// THE LOOP ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
	eng.timer = function() {
		if(window.performance && window.performance.now) {
			return window.performance.now();
		}
		
		return (new Date()).now();
	};

	eng.initCanvas = function() {
		eng.canvas = document.createElement("canvas");
		eng.canvas.id = eng.canvasInfo.id;
		eng.canvas.width = eng.canvasInfo.width;
		eng.canvas.height = eng.canvasInfo.height;
		eng.context = eng.canvas.getContext("2d");
		document.body.appendChild(eng.canvas);
	};

	eng.mainUpdate = function() {
		var updateEle = function(ele) {
			if(ele.isActive && ele.update) {
				ele.update(eng.frameSpeed);
			}
		};
		while(eng.dt >= eng.frameSpeed) {
			eng.dt -= eng.frameSpeed;
			eng.updatables.forEach(updateEle);
		}
	};

	eng.mainDraw = function() {
		//ugh, this needs to change to a buffering system at some point
		eng.context.clearRect(0, 0, eng.canvas.width, eng.canvas.height);
		eng.drawables.forEach(function(ele) {
			if(ele.gameObject.isActive) {
				ele.draw();
			}
		});
	};

	eng.frame = function() {
		eng.now = eng.timer();
		eng.dt += (eng.now - eng.last) / 1000;
		eng.mainUpdate();
		eng.mainDraw();
		eng.last = eng.now;
		window.requestAnimationFrame(eng.frame);
	};

	eng.initEngine = function() {
		eng.initCanvas();
		if(spriteResources) {
			eng.loadSprites(spriteResources, function(loadedSprites) {
				eng.sprites = loadedSprites;
				eng.spritesHaveLoaded = true;

				eng.last = eng.timer();
				//other stuff to initialize
				window.requestAnimationFrame(eng.frame);
				console.log("Engine intialized");
				eng.oninit.forEach(function(ele) {
					ele();
				});
			});
			console.log("Loading SpriteResources");
		}
	};

	return eng;
}();