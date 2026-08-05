// Enemy class - simple homing AI with basic melee attack and life
export default class Enemy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, key, opts = {}) {
    super(scene, x, y, key);
    scene.physics.world.enable(this);
    this.scene = scene;
    this.key = key;
    this.setDisplaySize(22, 22);
    this.setCollideWorldBounds(true);
    this.health = opts.health || 2;
    this.speed = opts.speed || 70;
    this.target = opts.target || null;
    this.attackCooldown = 800;
    this.lastAttack = 0;

    // small random wander direction
    this.wander = new Phaser.Math.Vector2(Phaser.Math.Between(-20,20), Phaser.Math.Between(-20,20));
  }

  preUpdate(time, delta) {
    super.preUpdate(time, delta);
    if (!this.active) return;
    if (this.target && this.target.active) {
      const dx = this.target.x - this.x, dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);
      const nx = dx / Math.max(1, dist), ny = dy / Math.max(1, dist);
      this.body.setVelocity(nx * this.speed, ny * this.speed);
      // attack if close
      if (dist < 22 && time > this.lastAttack + this.attackCooldown) {
        this.lastAttack = time;
        if (this.target.takeDamage) this.target.takeDamage(1);
      }
    } else {
      // wander
      this.body.setVelocity(this.wander.x, this.wander.y);
      if (Phaser.Math.Between(0, 600) < 6) {
        this.wander.set(Phaser.Math.Between(-50,50), Phaser.Math.Between(-50,50));
      }
    }
  }

  takeDamage(amount) {
    this.health -= amount;
    this.setTint(0xff9999);
    this.scene.time.delayedCall(80, () => this.clearTint());
    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    this.emit('killed');
    this.scene.events.emit('enemy-killed');
    // spawn small particle effect
    const p = this.scene.add.circle(this.x, this.y, 8, 0xff6666, 0.6);
    this.scene.tweens.add({
      targets: p, alpha: 0, scale: 0.2, duration: 400, onComplete: () => p.destroy()
    });
    this.destroy();
  }
}
