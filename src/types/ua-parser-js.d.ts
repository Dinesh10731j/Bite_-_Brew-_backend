declare module "ua-parser-js" {
  export interface IBrowser {
    name?: string;
    version?: string;
    major?: string;
  }
  export interface IDevice {
    model?: string;
    type?: string;
    vendor?: string;
  }
  export interface IOS {
    name?: string;
    version?: string;
  }

  export interface IResult {
    ua: string;
    browser: IBrowser;
    device: IDevice;
    os: IOS;
  }

  export default class UAParser {
    constructor(ua?: string);
    setUA(ua: string): this;
    getResult(): IResult;
    getBrowser(): IBrowser;
    getDevice(): IDevice;
    getOS(): IOS;
  }
}
