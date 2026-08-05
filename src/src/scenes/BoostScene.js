// BootScene - very small, sets up scale and basic configs
export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }
  preload() {
    // Could load a tiny progress sprite, but we'll use text
  }
  create() {
    // Quick configuration and go to preload
    this.scene.start('PreloadScene');
  }
}
