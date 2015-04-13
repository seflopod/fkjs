var spriteResources;
var bullets, enemies;
var curEnemyIdx = 0;
var maxEnemies = 50;

///////////////////////////////// BULLET CLASS /////////////////////////////////
function Bullet() {
	engine.GameObject.call(this);
	this.isActive = false;
	this.transform.position.x = -100;
	this.transform.position.y = -100;
	this.drawer = new engine.SpriteDrawer(this, engine.context);
	this.drawer.sprite = engine.sprites.player_bullet;
	this.speedX = 0;
	this.speedY = -250;
}
Bullet.prototype = Object.create(engine.GameObject.prototype);
Bullet.prototype.constructor = Bullet;
Bullet.prototype.checkEnemy = function(enemy) {
	if(this.isActive) {
		this.isActive = this.isActive &&
							!engine.hasCollided(this,
											this.drawer.sprite.width,
											this.drawer.sprite.height,
											enemy,
											enemy.drawer.sprite.width,
											enemy.drawer.sprite.height);
		enemy.isActive = this.isActive;
	}
};
Bullet.prototype.update = function(dt) {
	this.transform.position.y += this.speedY * dt;
	this.drawer.updateSprite(dt);

	if(this.transform.position.y < 0) {
		this.isActive = false;
	}

	if(this.isActive) {
		enemies.filter(function(ele) {
			return ele.isActive;
		}).forEach(this.checkEnemy, this);
	}
};

////////////////////////////////// ENEMY CLASS /////////////////////////////////
function Enemy() {
	engine.GameObject.call(this);
	this.isActive = false;
	this.transform.position.x = -100;
	this.transform.position.y = -100;
	this.speedX = 150;
	this.speedY = 100;
	this.drawer = new engine.SpriteDrawer(this, engine.context);
	this.drawer.sprite = engine.sprites.enemy;
	this.timeBeforeTryChangeDir = 0.5;
	this.changeDirAccum = 0;
	this.changeDirChance = 0.5;
	this.direction = (Math.random() < 0.5) ? -1 : 1;
}
Enemy.prototype = Object.create(engine.GameObject);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.update = function(dt) {
	this.changeDirAccum += dt;
	if(this.changeDirAccum >= this.timeBeforeTryChangeDir) {
		this.direction = (Math.random() < this.changeDirChance) ? -1 * this.direction : this.direction;
		this.changeDirAccum = 0;
	}

	this.transform.position.y += this.speedY * dt;
	var newX = this.transform.position.x;
	newX += this.direction * this.speedX * dt;
	newX = utils.clamp(utils.fastRound(newX), 0,
							engine.canvas.width -
											this.drawer.sprite.width);
	this.transform.position.x = newX;
	this.drawer.updateSprite(dt);

	if(this.transform.position.y > engine.canvas.height) {
		this.isActive = false;
	}
};

////////////////////////////// ENEMY SPAWNER CLASS /////////////////////////////
function EnemySpawner(maxEnemies) {
	engine.GameObject.call(this);
	this.maxEnemies = maxEnemies;
	this.spawnChance = 0.1; //per frame
}
EnemySpawner.prototype = Object.create(engine.GameObject);
EnemySpawner.prototype.spawnEnemy = function() {
	var e = enemies[curEnemyIdx++];
	if(curEnemyIdx >= maxEnemies) {
		curEnemyIdx = 0;
	}
	e.transform.position.x = Math.floor(engine.canvas.width / 4 +
											Math.random() *
											engine.canvas.width / 2);
	e.transform.position.y = -e.drawer.sprite.height;
	e.isActive = true;
};
EnemySpawner.prototype.update = function(dt) {
	if(Math.random() < this.spawnChance) {
		this.spawnEnemy();
	}
};
EnemySpawner.prototype.constructor = EnemySpawner;


///////////////////////////////// PLAYER CLASS /////////////////////////////////
function Player() {
	engine.GameObject.call(this);
	this.transform.position.x = 270;
	this.transform.position.y = 270;
	this.drawer = new engine.SpriteDrawer(this, engine.context);
	this.drawer.sprite = engine.sprites.player;
	this.maxBullets = 100;
	this.bulletIdx = 0;
	this.bullets = (function(maxBullets) {
		var createBullets = function(bArray, maxBullets) {
			if(bArray.length < maxBullets) {
				bArray.push(new Bullet());
				return createBullets(bArray, maxBullets);
			}
			return bArray;
		};
		return createBullets([], maxBullets);
	}(this.maxBullets));
	this.rateOfFire = 20; //bullets per sec
	this.fireCDAccum = 0;
	this.canFire = true;
	this.speedX = 200; //units per sec;
	this.speedY = 0; //units per sec;
}
Player.prototype = Object.create(engine.GameObject);
Player.prototype.fire = function() {
	var b = this.bullets[this.bulletIdx++];
	if(this.bulletIdx >= this.maxBullets) {
		this.bulletIdx = 0;
	}
	b.transform.position.x = this.transform.position.x +
								this.drawer.sprite.width / 2 -
								b.drawer.sprite.width / 2;
	b.transform.position.y = this.transform.position.y -
								b.drawer.sprite.height - 2;
	b.isActive = true;
	this.canFire = false;
};
Player.prototype.update = function(dt) {
	var newX = this.transform.position.x;
	if(engine.input.keysdown[37]) {
		newX -= this.speedX * dt;
	}

	if(engine.input.keysdown[39]) {
		newX += this.speedX * dt;
	}

	if(engine.input.keysdown[90] && this.canFire) { //z to fire
		this.fire();
	} else if(!this.canFire) {
		this.fireCDAccum += dt;
		if(this.rateOfFire * this.fireCDAccum >= 1) {
			this.canFire = true;
			this.fireCDAccum = 0;
		}
	}
	newX = utils.clamp(utils.fastRound(newX), 0,
						engine.canvas.width -
										this.drawer.sprite.width);
	this.transform.position.x = newX;

	this.drawer.updateSprite(dt);
};
Player.prototype.constructor = Player;

////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////// GAME INIT //////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function initGame() {
	enemies = function() {
		var e = [];
		for(var i=0;i<maxEnemies;++i) {
			e.push(new Enemy());
		}
		return e;
	}();

	var player = new Player();
	var enemySpawner = new EnemySpawner(maxEnemies);
}
document.body.onload = function() {
	spriteResources = [
		new engine.SpriteResource("player", "res/player_starship.png", 1, 32, 32),
		new engine.SpriteResource("enemy", "res/enemy_saucer.png", 1, 32, 21),
		new engine.SpriteResource("player_bullet", "res/player_bullet.png", 1, 4, 4)
	];
	engine.oninit.push(initGame);
	engine.initEngine();
};