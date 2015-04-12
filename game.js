var spriteResources;
var bullets, enemies;
var curBulletIdx = 0;
var maxBullets = 100;
var curEnemyIdx = 0;
var maxEnemies = 50;

function Bullet() {
	engine.GameObject.call(this);
	this.isActive = false;
	this.transform.position.x = -100;
	this.transform.position.y = -100;
	this.addComponent("spriteDrawer");
	this.spriteDrawer.sprite = engine.sprites.player_bullet;
	this.spriteDrawer.context = engine.context;
	this.speedX = 0;
	this.speedY = -250;
}
Bullet.prototype = Object.create(engine.GameObject.prototype);
Bullet.prototype.constructor = Bullet;
Bullet.prototype.update = function(dt) {
	this.transform.position.y += this.speedY * dt;
	this.spriteDrawer.updateSprite(dt);

	if(this.transform.position.y < 0) {
		this.isActive = false;
	}
};

function Enemy() {
	engine.GameObject.call(this);
	this.isActive = false;
	this.transform.position.x = -100
	this.transform.position.y = -100;
	this.speedX = 150;
	this.speedY = 100;
	this.addComponent("spriteDrawer");
	this.spriteDrawer.sprite = engine.sprites.enemy;
	this.spriteDrawer.context = engine.context;
	this.dir = (Math.random() < 0.5) ? -1 : 1;
}
Enemy.prototype = Object.create(engine.GameObject);
Enemy.prototype.constructor = Enemy;
Enemy.prototype.checkBullet = function(bullet) {
	if(bullet.isActive) {
		this.isActive = this.isActive &&
						!engine.hasCollided(this,
										this.spriteDrawer.sprite.width,
										this.spriteDrawer.sprite.height,
										bullet,
										bullet.spriteDrawer.sprite.width,
										bullet.spriteDrawer.sprite.height);
		bullet.isActive = this.isActive;
	}
};
Enemy.prototype.update = function(dt) {
	this.transform.position.y += this.speedY * dt;
	var newX = this.transform.position.x
	this.dir = (Math.random() < 0.1) ? -1 * this.dir : this.dir;
	newX += this.dir * this.speedX * dt;
	newX = utils.clamp(utils.fastRound(newX), 0,
							engine.canvas.width -
											this.spriteDrawer.sprite.width);
	this.transform.position.x = newX;
	this.spriteDrawer.updateSprite(dt);

	if(this.transform.position.y > engine.canvas.height) {
		this.isActive = false;
	}

	if(this.isActive) {
		bullets.forEach(this.checkBullet);
	}
};

function initGame() {
	bullets = function() {
		var b = [];
		for(var i=0;i<maxBullets;++i) {
			b.push(Bullet());
		};
		return b;
	}();

	enemies = function() {
		var e = [];
		for(var i=0;i<maxEnemies;++i) {
			e.push(Enemy());
		};
		return e;
	}();

	var player = function() {
		engine.GameObject.call(this);
		this.transform.position.x = 270;
		this.transform.position.y = 270;
		this.addComponent("spriteDrawer", engine.context);
		this.spriteDrawer.context = engine.context;
		this.spriteDrawer.sprite = engine.sprites.player;
		this.speedX = 200; //units per sec;
		this.speedY = 0; //units per sec;
		this.fire = function() {
			var b = bullets[curBulletIdx++];
			if(curBulletIdx >= maxBullets) {
				curBulletIdx = 0;
			}
			b.transform.position.x = this.transform.position.x +
										this.spriteDrawer.sprite.width / 2 -
										b.spriteDrawer.sprite.width / 2;
			b.transform.position.y = this.transform.position.y -
										b.spriteDrawer.sprite.height - 2;
			b.isActive = true;
		};
		this.update = function(dt) {
			var newX = this.transform.position.x;
			if(engine.input.keysdown[37]) {
				newX -= this.speedX * dt;
			}

			if(engine.input.keysdown[39]) {
				newX += this.speedX * dt;
			}

			if(engine.input.keysdown[90]) { //z to fire
				this.fire();
			}
			newX = utils.clamp(utils.fastRound(newX), 0,
								engine.canvas.width -
												this.spriteDrawer.sprite.width);
			this.transform.position.x = newX;

			this.spriteDrawer.updateSprite(dt);
		};
	}();

	var enemySpawner = function() {
		engine.GameObject.call(this);
		this.spawnChance = 0.1; //per frame
		this.spawnEnemy = function() {
			var e = enemies[curEnemyIdx++]
			if(curEnemyIdx >= maxEnemies) {
				curEnemyIdx = 0;
			}
			e.transform.position.x = Math.floor(engine.canvas.width / 4 +
													Math.random() *
													engine.canvas.width / 2);
			e.transform.position.y = -e.spriteDrawer.sprite.height;
			e.isActive = true;
		};
		this.update = function(dt) {
			if(Math.random() < this.spawnChance) {
				this.spawnEnemy();
			}
		};
	}();
}
document.body.onload = function() {
	spriteResources = [
		new engine.SpriteResource("player", "res/player_starship.png", 1, 32, 32),
		new engine.SpriteResource("enemy", "res/enemy_saucer.png", 1, 32, 32),
		new engine.SpriteResource("player_bullet", "res/player_bullet.png", 1, 4, 4)
	];
	engine.oninit.push(initGame);
	engine.initEngine();
};