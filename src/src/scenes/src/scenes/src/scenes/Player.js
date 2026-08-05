// Player class: handles movement, shooting, dash, health and upgrades
import Bullet from '../weapons/Bullet.js';

export default class Player extends Phaser.GameObjects.Container {
  constructor(scene, x, y, key) {
    super(scene, x, y);
    this.scene = scene;
    this.sprite = scene.add.image(0, 0, 'player');
    this.sprite.setDisplaySize(28, 28);
    this.add(this.sprite);

    // physics body
    scene.physics.world.enable(this);
    this.body.setCollideWorldBounds(true);
    this.body.setSize(16, 16);

    // stats
    this.maxHealth = 10;
    this.health = 10;
    this.speed = 160;
    this.baseSpeed = 160;
    this.canShoot = true;
    this.fireRate = 180; // ms
    this.lastShot = 0;
    this.damage = 1;
    this.isDashing = false;
    this.dashCooldown = 1000;
    this.lastDash = -9999;

    // input
    this.keys = scene.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      shoot: Phaser.Input.Keyboard.KeyCodes.Z,
      dash: Phaser.Input.Keyboard.KeyCodes.X
    });

    this.scene.events.on('update', this.update, this);
  }

  update(time, delta) {
    if (!this.active) return;
    const k = this.keys;
    let vx = 0, vy = 0;
    if (k.left.isDown || k.left2.isDown) vx = -1;
    if (k.right.isDown || k.right2.isDown) vx = 1;
    if (k.up.isDown || k.up2.isDown) vy = -1;
    if (k.down.isDown || k.down2.isDown) vy = 1;
    const len = Math.hypot(vx, vy);
    if (len > 0) {
      vx /= len; vy /= len;
    }
    const spd = this.speed * (this.isDashing ? 3 : 1);
    this.body.setVelocity(vx * spd, vy * spd);

    // rotation toward pointer
    const pointer = this.scene.input.activePointer;
    const worldPtr = pointer.positionToCamera(this.scene.cameras.main);
    const angle = Phaser.Math.Angle.Between(this.x, this.y, worldPtr.x, worldPtr.y);
    this.rotation = angle;

    // shooting
    if ((k.shoot.isDown || pointer.isDown) && time > this.lastShot + this.fireRate) {
      this.shoot(angle);
      this.lastShot = time;
    }

    // dash
    if (Phaser.Input.Keyboard.JustDown(k.dash) && (time > this.lastDash + this.dashCooldown)) {
      this.doDash(angle);
      this.lastDash = time;
    }

    // slight friction when no input (to prevent sliding)
    if (len === 0 && !this.isDashing) {
      this.body.velocity.scale(0.92);
    }

    // regenerate small amount over time
    if (this.health < this.maxHealth && time % 6000 < delta) {
      this.health = Math.min(this.maxHealth, this.health + 1);
    }
  }

  shoot(angle) {
    const b = new Bullet(this.scene, this.x + Math.cos(angle) * 16, this.y + Math.sin(angle) * 16, 'bullet', { damage: this.damage, vx: Math.cos(angle) * 420, vy: Math.sin(angle) * 420 });
    this.scene.add.existing(b);
    this.scene.bullets.add(b);
  }

  doDash(angle) {
    this.isDashing = true;
    const dashVel = 520;
    this.body.setVelocity(Math.cos(angle) * dashVel, Math.sin(angle) * dashVel);
    this.scene.tweens.addCounter({
      from: 0, to: 1, duration: 200, onComplete: () => {
        this.isDashing = false;
      }
    });
  }

  takeDamage(amount) {
    if (this.isDashing) { return; } // invulnerable while dashing
    this.health -= amount;
    if (this.health <= 0) {
      this.die();
    }
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  addSpeed(amount, duration = 5000) {
    this.speed += amount;
    this.scene.time.delayedCall(duration, () => {
      this.speed = Math.max(this.baseSpeed, this.speed - amount);
    });
  }

  die() {
    this.setActive(false);
    this.setVisible(false);
    this.body.setVelocity(0,0);
    const g = this.scene.add.text(this.scene.scale.width/2, this.scene.scale.height/2, 'You died\nPress ENTER to restart', { font: '28px monospace', color:'#f33', align:'center' }).setOrigin(0.5).setScrollFactor(0);
    this.scene.input.keyboard.once('keydown-ENTER', () => {
      this.scene.scene.restart({ seed: Date.now() });
    });
  }
}
