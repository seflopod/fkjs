var engine = (function() {
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

	eng.input = (function() {
		var that = {};

		that.keysdown = {};
		var onKeyDown = function(e) {
			that.keysdown[e.keyCode] = true;
		};
		var onKeyUp = function(e) {
			delete that.keysdown[e.keyCode];
		};

		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);
		
		return that;
	}());

	eng.Vec2 = function(x, y) {
		if(arguments.length === 0) {
			x = 0;
			y = 0;
		}		
		this.x = x;
		this.y = y;
	};
	eng.Vec2.prototype = {
		sqrMagnitude: function() {
		return utils.strip(this.x * this.x + this.y * this.y);
		},
		magnitude: function() {
			return Math.sqrt(this.sqrMagnitude());
		},
		normalized: function() {
			var mag = this.magnitude();
			return eng.Vec2(this.x / mag, this.y / mag);
		},
		makeNormal: function() {
			var mag = this.magnitude();
			this.x /= mag;
			this.y /= mag;
		}
	};
	eng.Vec2.dot = function(vecA, vecB) {
		return utils.strip(vecA.x * vecB.x + vecA.y * vecB.y);
	};
	eng.Vec2.distance = function(vecA, vecB) {
		var vec = eng.Vec2(vecB.x - vecA.x, vecB.y - vecB.y);
		return vec.magnitude();
	};
	eng.Vec2.angle = function(vecA, vecB) {
		var dotProduct = eng.vec2utils.dot(vecA, vecB);
		return Math.acos(utils.strip(dotProduct / (vecA.magnitude() * vecB.magnitude())));
	};
	eng.Vec2.lerp = function(vecA, vecB, t) {
		t = utils.clamp(t, 0, 1);
		var newX = utils.strip(t * (vecB.x - vecA.x) / 2);
		var newY = vecA.y + (vecB.y - vecA.y) * (newX - vecA.x) / (vecB.x - vecA.x);
		return eng.Vec2(newX, newY);
	};

	eng.Sprite = function(image, numSubImages, subImageWidth, subImageHeight) {
		this.image = image;
		this.width = image.naturalWidth;
		this.height = image.naturalHeight;
		this.numSubImages = numSubImages;
		this.subImageWidth = subImageWidth;
		this.subImageHeight = subImageHeight;
	};

	eng.SpriteResource = function(name, location, numSubImages, subImageWidth,
									subImageHeight) {
		this.name = name;
		this.location = location;
		this.numSubImages = Math.max(1, numSubImages);
		this.subImageWidth = Math.max(1, subImageWidth);
		this.subImageHeight = Math.max(1, subImageHeight);
	};

	eng.loadSprites = function(spriteResourcesArray, callback) {
		var sprites = {};
		var loadedSprites = 0;
		var numSprites = spriteResourcesArray.length;

		var createImgElement = function(res) {
			var img = new Image();
			img.src = res.location;
			img.onload = function() {
				sprites[res.name] = new eng.Sprite(img,
													res.numSubImages,
													res.subImageWidth,
													res.subImageHeight);
				console.log("Loaded " + res.location + " as " + res.name);
				if(++loadedSprites >= numSprites) {
					console.log("All sprites loaded");
					callback(sprites);
				}				
			};
			img.onerror = function() {
				console.log("Unable to load the image at " + res.location +
								". Sprite named " + res.name + " not created.");
				loadedSprites++;
			};
		};

		spriteResourcesArray.forEach(createImgElement);
	};

////////////////////////////////////////////////////////////////////////////////
////////////////////////////////// COMPONENTS //////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
	eng.Transformation = function() {
		this.position = new eng.Vec2(0, 0);
		this.rotation = 0;
		this.scale = new eng.Vec2(1, 1);
	};

	eng.SpriteDrawer = function(go, ctx) {
		if(ctx) {
			this.context = ctx;
		} else {
			this.context = null;
		}
		this.gameObject = go;
		this.imageSpeed = 0; //per second speed
		this.curSubIndex = 0;
		this.loop = true;
		this.sprite = null;
	};
	eng.SpriteDrawer.prototype = {
		updateSprite: function(dt) {
			//Should this just be an update that is run with updatables?
			this.curSubIndex = Math.floor(this.imageSpeed * dt);
			if(this.sprite && this.curSubIndex > this.sprite.numSubImages) {
				if(this.loop) {
					this.curSubIndex = 0;
				} else {
					this.curSubIndex -= 1;
				}
			}
		}
	};
	eng.SpriteDrawer.prototype.draw = function() {
		if(this.gameObject && this.context && this.sprite) {
			//draws as if the position is the TOP LEFT of the sprite
			//I don't know if this is good, bad, or neither.  I should probably
			//have an option for it at some point.
			var pos = this.gameObject.transform.position;
			this.context.drawImage(this.sprite.image,
								this.curSubIndex * this.sprite.subImageWidth,
								0,
								this.sprite.subImageWidth,
								this.sprite.subImageHeight,
								pos.x,
								pos.y,
								this.sprite.subImageWidth *
									this.gameObject.transform.scale.x,
								this.sprite.subImageHeight *
									this.gameObject.transform.scale.y);
		}
	};
	eng.SpriteDrawer.prototype.constructor = eng.SpriteDrawer;

	eng.GameObject = function() {
		this.isActive = true;
		this.transform = new eng.Transformation();
		eng.updatables.push(this);
		eng.drawables.push(this);
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
		//ugh, I keep reading about how this might be bad, but I'm not sure how
		//to fix it yet.
		eng.context.clearRect(0, 0, eng.canvas.width, eng.canvas.height);
		eng.drawables.forEach(function(ele) {
			if(ele.isActive && ele.drawer && ele.drawer.draw) {
				ele.drawer.draw();
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
}());