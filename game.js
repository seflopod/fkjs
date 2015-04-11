var spriteResources;
var bullets, enemies;
var curBulletIdx = 0;
var maxBullets = 100;
var curEnemyIdx = 0;
var maxEnemies = 50;

function Bullet() {
	var that = engine.GameObject();
	that.isActive = false;
	that.transform.position.x = -100;
	that.transform.position.y = -100;
	that.addComponent("spriteDrawer");
	that.spriteDrawer.sprite = engine.sprites.player_bullet;
	that.spriteDrawer.context = engine.context;
	that.speedX = 0;
	that.speedY = -250;
	that.update = function(dt) {
		that.transform.position.y += that.speedY * dt;
		that.spriteDrawer.updateSprite(dt);

		if(that.transform.position.y < 0) {
			that.isActive = false;
		}
	};
	return that;
}

function Enemy() {
	var that = engine.GameObject();
	that.isActive = false;
	that.transform.position.x = -100
	that.transform.position.y = -100;
	that.speedX = 150;
	that.speedY = 100;
	that.addComponent("spriteDrawer");
	that.spriteDrawer.sprite = engine.sprites.enemy;
	that.spriteDrawer.context = engine.context;
	that.dir = (Math.random() < 0.5) ? -1 : 1;
	that.checkBullet = function(bullet) {
		if(bullet.isActive) {
			that.isActive = that.isActive &&
							!engine.hasCollided(that,
											that.spriteDrawer.sprite.width,
											that.spriteDrawer.sprite.height,
											bullet,
											bullet.spriteDrawer.sprite.width,
											bullet.spriteDrawer.sprite.height);
			bullet.isActive = that.isActive;
		}
	};
	that.update = function(dt) {
		that.transform.position.y += that.speedY * dt;
		var newX = that.transform.position.x
		that.dir = (Math.random() < 0.1) ? -1 * that.dir : that.dir;
		newX += that.dir * that.speedX * dt;
		newX = utils.clamp(utils.fastRound(newX), 0,
								engine.canvas.width -
												that.spriteDrawer.sprite.width);
		that.transform.position.x = newX;
		that.spriteDrawer.updateSprite(dt);

		if(that.transform.position.y > engine.canvas.height) {
			that.isActive = false;
		}

		if(that.isActive) {
			bullets.forEach(that.checkBullet);
		}
	};
	return that;
}

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
		var that = engine.GameObject();
		that.transform.position.x = 270;
		that.transform.position.y = 270;
		that.addComponent("spriteDrawer");
		that.spriteDrawer.sprite = engine.sprites.player;
		that.spriteDrawer.context = engine.context;
		that.speedX = 200; //units per sec;
		that.speedY = 0; //units per sec;
		that.fire = function() {
			var b = bullets[curBulletIdx++];
			if(curBulletIdx >= maxBullets) {
				curBulletIdx = 0;
			}
			b.transform.position.x = that.transform.position.x +
										that.spriteDrawer.sprite.width / 2 -
										b.spriteDrawer.sprite.width / 2;
			b.transform.position.y = that.transform.position.y -
										b.spriteDrawer.sprite.height - 2;
			b.isActive = true;
		};
		that.update = function(dt) {
			var newX = that.transform.position.x;
			if(engine.input.keysdown[37]) {
				newX -= that.speedX * dt;
			}

			if(engine.input.keysdown[39]) {
				newX += that.speedX * dt;
			}

			if(engine.input.keysdown[90]) { //z to fire
				that.fire();
			}
			newX = utils.clamp(utils.fastRound(newX), 0,
								engine.canvas.width -
												that.spriteDrawer.sprite.width);
			that.transform.position.x = newX;

			that.spriteDrawer.updateSprite(dt);
		};
		return that;
	}();

	var enemySpawner = function() {
		var that = engine.GameObject();
		that.spawnChance = 0.1; //per frame
		that.spawnEnemy = function() {
			var e = enemies[curEnemyIdx++]
			if(curEnemyIdx >= maxEnemies) {
				curEnemyIdx = 0;
			}
			e.transform.position.x = Math.floor(engine.canvas.width / 4 +
													Math.random() *
													engine.canvas.width / 2);
			e.transform.position.y = -e.spriteDrawer.sprite.height;
			e.isActive = true;
		}
		that.update = function(dt) {
			if(Math.random() < that.spawnChance) {
				that.spawnEnemy();
			}
		}
		return that;
	}();
}
document.body.onload = function() {
	spriteResources = [
		engine.SpriteResource("player", "res/player_starship.png", 1, 32, 32),
		engine.SpriteResource("enemy", "res/enemy_saucer.png", 1, 32, 32),
		engine.SpriteResource("player_bullet", "res/player_bullet.png", 1, 4, 4)
	];
	engine.oninit.push(initGame);
	engine.initEngine();
};