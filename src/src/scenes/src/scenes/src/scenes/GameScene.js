// GameScene - main gameplay: player, enemies, bullets, pickups, procedural rooms, HUD
import Player from '../player/Player.js';
import Enemy from '../enemy/Enemy.js';
import Bullet from '../weapons/Bullet.js';
import LevelGenerator from '../LevelGenerator.js';
import HUD from '../ui/HUD.js';

export default class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
    this.roomIndex = 0;
  }

  init(data) {
    this.seed = data.seed || 0;
  }

  create() {
    // physics world bounds set large for multiple rooms
    this.cameras.main.setBackgroundColor('#0b1220');

    // groups
    this.wallLayer = this.add.layer();
    this.walls = this.physics.add.staticGroup();
    this.enemies = this.physics.add.group({ classType: Enemy, runChildUpdate: true });
    this.bullets = this.physics.add.group({ classType: Bullet, runChildUpdate: true, maxSize: 200 });
    this.items = this.physics.add.group();

    // level generator
    this.levelGen = new LevelGenerator(this, this.seed);

    // spawn first room
    this.room = this.levelGen.createRoom(0);
    this.createWallsFromRoom(this.room);

    // spawn player in center
    this.player = new Player(this, this.room.center.x, this.room.center.y, 'player');
    this.add.existing(this.player);
    this.physics.add.existing(this.player);

    // camera follow
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
    this.cameras.main.setZoom(1.1);

    // collisions
    this.physics.add.collider(this.player, this.walls);
    this.physics.add.collider(this.enemies, this.walls);
    this.physics.add.collider(this.bullets, this.walls, (b) => b.destroy());
    this.physics.add.overlap(this.bullets, this.enemies, (b, e) => {
      if (b && e) { e.takeDamage(b.damage); b.destroy(); }
    });
    this.physics.add.overlap(this.player, this.enemies, (p, e) => {
      if (e.active && p.active) p.takeDamage(1);
    });
    this.physics.add.overlap(this.player, this.items, (p, it) => {
      if (it.pickupType === 'health') { p.heal(2); }
      else if (it.pickupType === 'speed') { p.addSpeed(40, 8000); }
      it.destroy();
    });

    // spawn some enemies and items
    this.populateRoom(this.room);

    // HUD
    this.hud = new HUD(this);
    this.add.existing(this.hud);

    // input
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.pause();
      this.scene.launch('MenuScene');
    });

    // text indicator for room
    this.roomText = this.add.text(12, 12, 'Room 1', { font: '14px monospace', color:'#fff' }).setScrollFactor(0).setDepth(100);
    this.roomText.setAlpha(0.9);

    // spawn next-room trigger - simple: when enemies cleared, spawn next
    this.events.on('enemy-killed', () => {
      if (this.enemies.countActive(true) === 0) {
        this.time.delayedCall(600, () => this.nextRoom(), [], this);
      }
    });
  }

  update(time, delta) {
    // update UI
    this.hud.update();
    this.roomText.setText(`Room ${this.roomIndex + 1}  |  Enemies: ${this.enemies.countActive(true)}`);

    // paced enemy spawn logic
    if (this.enemies.countActive(true) < 5 && Phaser.Math.Between(0, 1000) < 8) {
      const p = this.levelGen.randomPointInRoom(this.room);
      const e = new Enemy(this, p.x, p.y, 'enemy', { target: this.player });
      this.add.existing(e);
      this.enemies.add(e);
    }
  }

  createWallsFromRoom(room) {
    // create grid-based walls around room tiles
    const tileSize = 32;
    room.tiles.forEach(t => {
      if (t.type === 'wall') {
        const wx = t.x * tileSize + tileSize/2;
        const wy = t.y * tileSize + tileSize/2;
        const w = this.walls.create(wx, wy, 'wall');
        w.setDisplaySize(tileSize, tileSize);
        w.refreshBody();
      }
    });
  }

  populateRoom(room) {
    // spawn enemies
    for (let i = 0; i < room.initialEnemies; i++) {
      const p = this.levelGen.randomPointInRoom(room);
      const e = new Enemy(this, p.x, p.y, 'enemy', { health: 3, target: this.player });
      this.add.existing(e);
      this.enemies.add(e);
    }
    // spawn items
    for (let k = 0; k < 2; k++) {
      const p = this.levelGen.randomPointInRoom(room);
      const it = this.physics.add.image(p.x, p.y, 'item');
      it.pickupType = (k%2===0? 'health' : 'speed');
      this.items.add(it);
    }
  }

  nextRoom() {
    this.roomIndex++;
    // clear current walls/items/enemies
    this.walls.clear(true, true);
    this.enemies.clear(true, true);
    this.items.clear(true, true);

    this.room = this.levelGen.createRoom(this.roomIndex);
    this.createWallsFromRoom(this.room);
    // reposition player near center
    this.player.setPosition(this.room.center.x, this.room.center.y);
    this.populateRoom(this.room);
  }
}
