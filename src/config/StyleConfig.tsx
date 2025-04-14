import { rgbaToHex } from '../chart/Utils';

export default class StyleConfig {
  private static instance: StyleConfig;

  private _style: any;

  private constructor() {}
  
  // Public getter for style property
  public getStyle(): any {
    return this._style;
  }

  public static async getInstance(): Promise<StyleConfig> {
    if (!this.instance) {
      this.instance = await this.create();
    }
    return this.instance;
  }

  async initialize() {
    try {
      await (await fetch('style.config.json')).json().then((json) => {
        this._style = json;
      });
    } catch (e) {
      this._style = {};
    }
  }

  static async create() {
    const o = new StyleConfig();
    await o.initialize();
    o.applyCSS();
    return o;
  }

  public applyCSS() {
    const rules = this._style?.style || {};
    for (const [key, value] of Object.entries(rules)) {
      document.documentElement.style.setProperty(key, value);
    }
  }

  public complementColor(color: string) {
    const propValue = document.documentElement.style.getPropertyValue(color) || '';
    const hexColor = rgbaToHex(propValue);
    const complementColor = (0xffffff - parseInt(hexColor.replace('#', ''), 16)).toString(16);
    return `#${complementColor}`;
  }
}
