const _ = require('lodash');
const validScheme = require('../configurations.mock').validOneDeviceAndSession;
const validIosNoneScheme = require('../configurations.mock').validOneIosNoneDeviceNoSession;

const invalidDeviceNoBinary = require('../configurations.mock').invalidDeviceNoBinary;
const invalidDeviceNoDeviceName = require('../configurations.mock').invalidDeviceNoDeviceName;

describe('Device', () => {
  let fs;
  let ws;
  let cpp;
  let DeviceDriverBase;
  let SimulatorDriver;
  let IosDriver;
  let Device;
  let device;
  let argparse;
  let sh;

  let Client;
  let client;

  beforeEach(async () => {
    Device = require('./Device');
    jest.mock('npmlog');

    jest.mock('../utils/sh');
    sh = require('../utils/sh');
    sh.cp = jest.fn();

    jest.mock('fs');
    fs = require('fs');
    jest.mock('../ios/expect');
    jest.mock('child-process-promise');
    cpp = require('child-process-promise');

    jest.mock('../utils/environment');

    jest.mock('./Fbsimctl');
    jest.mock('./AppleSimUtils');

    jest.mock('../client/Client');
    jest.mock('../utils/argparse');
    argparse = require('../utils/argparse');

    jest.mock('./DeviceDriverBase');
    DeviceDriverBase = require('./DeviceDriverBase');
    SimulatorDriver = require('./SimulatorDriver');
    IosDriver = require('./IosDriver');
    Client = require('../client/Client');

    client = new Client(validScheme.session);
    await client.connect();

  });

  function validDevice() {
    const device = new Device(validScheme.configurations['ios.sim.release'], validScheme.session, new DeviceDriverBase(client));
    fs.existsSync.mockReturnValue(true);
    device.deviceDriver.defaultLaunchArgsPrefix.mockReturnValue('-');
    device.deviceDriver.acquireFreeDevice.mockReturnValue('mockDeviceId');

    return device;
  }

  function validSimulator() {
    const device = new Device(validScheme.configurations['ios.sim.release'], validScheme.session, new SimulatorDriver(client));
    fs.existsSync.mockReturnValue(true);
    device.deviceDriver.acquireFreeDevice.mockReturnValue('mockDeviceId');

    return device;
  }

  function validIosNone() {
    const device = new Device(validIosNoneScheme.configurations['ios.none'], validScheme.session, new IosDriver(client));
    fs.existsSync.mockReturnValue(true);
    device.deviceDriver.acquireFreeDevice.mockReturnValue('mockDeviceId');

    return device;
  }

  it(`valid scheme, no binary, should throw`, async () => {
    device = validDevice();
    fs.existsSync.mockReturnValue(false);
    try {
      await device.prepare();
      fail('should throw')
    } catch (ex) {
      expect(ex).toBeDefined();
    }
  });

  it(`valid scheme, no binary, should not throw`, async () => {
    device = validDevice()
    await device.prepare();
  });

  it(`prepare() should boot a device`, async () => {
    device = validDevice();
    cpp.exec.mockReturnValue(() => Promise.resolve());
    fs.existsSync.mockReturnValue(true);
    await device.prepare();

    expect(device.deviceDriver.boot).toHaveBeenCalledTimes(1);
  });

  it(`prepare() should boot a device`, async () => {
    device = validDevice();
    cpp.exec.mockReturnValue(() => Promise.resolve());
    fs.existsSync.mockReturnValue(true);
    await device.prepare();

    expect(device.deviceDriver.boot).toHaveBeenCalledTimes(1);
  });

  it(`prepare() with when reuse is enabled should not uninstall and install`, async () => {
    device = validDevice();
    cpp.exec.mockReturnValue(() => Promise.resolve());
    fs.existsSync.mockReturnValue(true);
    argparse.getArgValue.mockReturnValue(true);

    await device.prepare();

    expect(device.deviceDriver.uninstallApp).not.toHaveBeenCalled();
    expect(device.deviceDriver.installApp).not.toHaveBeenCalled();
  });

  it(`launchApp() should launch app with default launch args`, async () => {
    device = validDevice();

    await device.launchApp();

    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test"});
  });

  it(`relaunchApp()`, async () => {
    device = validDevice();

    await device.relaunchApp();

    expect(device.deviceDriver.terminate).toHaveBeenCalled();
    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test"});
  });

  it(`relaunchApp({newInstance: false}) should not terminate the app before launch`, async () => {
    device = validDevice();

    await device.relaunchApp({newInstance: false});

    expect(device.deviceDriver.terminate).not.toHaveBeenCalled();
  });

  it(`relaunchApp({newInstance: true}) should terminate the app before launch`, async () => {
    device = validDevice();

    await device.relaunchApp({newInstance: true});

    expect(device.deviceDriver.terminate).toHaveBeenCalled();
  });

  it(`relaunchApp() (no params) should terminate the app before launch - backwards compat`, async () => {
    device = validDevice();

    await device.relaunchApp();

    expect(device.deviceDriver.terminate).toHaveBeenCalled();
  });

  it(`relaunchApp() with delete=true`, async () => {
    device = validDevice();
    fs.existsSync.mockReturnValue(true);

    await device.relaunchApp({delete: true});

    expect(device.deviceDriver.uninstallApp).toHaveBeenCalled();
    expect(device.deviceDriver.installApp).toHaveBeenCalled();
    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test"});
  });

  it(`relaunchApp() without delete when reuse is enabled should not uninstall and install`, async () => {
    device = validDevice();
    argparse.getArgValue.mockReturnValue(true);
    fs.existsSync.mockReturnValue(true);

    await device.relaunchApp();

    expect(device.deviceDriver.uninstallApp).not.toHaveBeenCalled();
    expect(device.deviceDriver.installApp).not.toHaveBeenCalled();
    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test"});
  });

  it(`relaunchApp() without delete when reuse is enabled should not uninstall and install`, async () => {
    device = validSimulator();
    argparse.getArgValue.mockReturnValue(true);
    fs.existsSync.mockReturnValue(true);

    await device.relaunchApp();

    expect(device.deviceDriver.uninstallApp).not.toHaveBeenCalled();
    expect(device.deviceDriver.installApp).not.toHaveBeenCalled();
    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test"});
  });

  it(`relaunchApp() with url should send the url as a param in launchParams`, async () => {
    device = await  validDevice();
    await device.relaunchApp({url: `scheme://some.url`});

    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test", "-detoxURLOverride": "scheme://some.url"});
  });

  it(`relaunchApp() with url should send the url as a param in launchParams`, async () => {
    device = await  validDevice();
    await device.relaunchApp({url: `scheme://some.url`, sourceApp: 'sourceAppBundleId'});

    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test", "-detoxURLOverride": "scheme://some.url", "-detoxSourceAppOverride":
        "sourceAppBundleId"});
  });

  it(`relaunchApp() with userNofitication should send the userNotification as a param in launchParams`, async () => {
    device = validDevice();
    fs.existsSync.mockReturnValue(true);
    device.deviceDriver.createPushNotificationJson = jest.fn(() => 'url');

    await device.relaunchApp({userNotification: 'json'});

    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test", "-detoxUserNotificationDataURL": "url"});
  });

  it(`relaunchApp() with url and userNofitication should throw`, async () => {
    device = validDevice();
    try {
      await device.relaunchApp({url: "scheme://some.url", userNotification: 'notif'});
      fail('should fail');
    } catch (ex) {
      expect(ex).toBeDefined();
    }
  });

  it(`relaunchApp() with permissions should send trigger setpermissions before app starts`, async () => {
    device = await validDevice();
    await device.relaunchApp({permissions: {calendar: "YES"}});

    expect(device.deviceDriver.setPermissions).toHaveBeenCalledWith(device._deviceId,
      device._bundleId, {calendar: "YES"});
  });

  it(`launchApp({launchArgs: }) should pass to native as launch args`, async () => {
    device = validDevice();

    await device.launchApp({launchArgs: {arg1: "1", arg2: 2}});

    expect(device.deviceDriver.launch).toHaveBeenCalledWith(device._deviceId,
      device._bundleId,
      {"-detoxServer": "ws://localhost:8099", "-detoxSessionId": "test", "-arg1": "1", "-arg2": 2});
  });

  it(`sendToHome() should pass to device driver`, async () => {
    device = validDevice();
    await device.sendToHome();

    expect(device.deviceDriver.sendToHome).toHaveBeenCalledTimes(1);
  });

  it(`terminateApp() should pass to device driver`, async () => {
    device = validDevice();
    await device.terminateApp();

    expect(device.deviceDriver.terminate).toHaveBeenCalledTimes(1);
  });

  it(`installApp() with a custom app path should use custom app path`, async () => {
    device = validDevice();
    fs.existsSync.mockReturnValue(true);

    await device.installApp('newAppPath');

    expect(device.deviceDriver.installApp).toHaveBeenCalledWith(device._deviceId, 'newAppPath');
  });

  it(`installApp() with no params should use the default path given in configuration`, async () => {
    device = validDevice();

    await device.installApp();

    expect(device.deviceDriver.installApp).toHaveBeenCalledWith(device._deviceId, device._binaryPath);
  });

  it(`uninstallApp() with a custom app path should use custom app path`, async () => {
    device = validDevice();
    fs.existsSync.mockReturnValue(true);

    await device.uninstallApp('newBundleId');

    expect(device.deviceDriver.uninstallApp).toHaveBeenCalledWith(device._deviceId, 'newBundleId');
  });

  it(`uninstallApp() with no params should use the default path given in configuration`, async () => {
    device = validDevice();

    await device.uninstallApp();

    expect(device.deviceDriver.uninstallApp).toHaveBeenCalledWith(device._deviceId, device._binaryPath);
  });

  it(`shutdown() should pass to device driver`, async () => {
    device = validDevice();
    await device.shutdown();

    expect(device.deviceDriver.shutdown).toHaveBeenCalledTimes(1);
  });

  it(`openURL({url:url}) should pass to device driver`, async () => {
    device = validDevice();
    await device.openURL({url: 'url'});

    expect(device.deviceDriver.openURL).toHaveBeenCalledWith(device._deviceId, {url: 'url'});
  });

  it(`openURL(notAnObject) should pass to device driver`, async () => {
    device = validDevice();
    try {
      await device.openURL('url');
      fail('should throw');
    } catch (ex) {
      expect(ex).toBeDefined();
    }
  });

  it(`reloadReactNative() should pass to device driver`, async () => {
    device = validDevice();
    await device.reloadReactNative();

    expect(device.deviceDriver.reloadReactNative).toHaveBeenCalledTimes(1);
  });

  it(`setOrientation() should pass to device driver`, async () => {
    device = validDevice();
    await device.setOrientation('param');

    expect(device.deviceDriver.setOrientation).toHaveBeenCalledWith(device._deviceId, 'param');
  });

  it(`sendUserNotification() should pass to device driver`, async () => {
    device = validDevice();
    await device.sendUserNotification('notif');

    expect(device.deviceDriver.sendUserNotification).toHaveBeenCalledWith('notif');
  });

  it(`setLocation() should pass to device driver`, async () => {
    device = validDevice();
    await device.setLocation(30, 30);

    expect(device.deviceDriver.setLocation).toHaveBeenCalledWith(device._deviceId, '30', '30');
  });

  it(`setURLBlacklist() should pass to device driver`, async () => {
    device = validDevice();
    await device.setURLBlacklist();

    expect(device.deviceDriver.setURLBlacklist).toHaveBeenCalledTimes(1);
  });

  it(`enableSynchronization() should pass to device driver`, async () => {
    device = validDevice();
    await device.enableSynchronization();

    expect(device.deviceDriver.enableSynchronization).toHaveBeenCalledTimes(1);
  });

  it(`disableSynchronization() should pass to device driver`, async () => {
    device = validDevice();
    await device.disableSynchronization();

    expect(device.deviceDriver.disableSynchronization).toHaveBeenCalledTimes(1);
  });

  it(`resetContentAndSettings() should pass to device driver`, async () => {
    device = validDevice();
    await device.resetContentAndSettings();

    expect(device.deviceDriver.resetContentAndSettings).toHaveBeenCalledTimes(1);
  });

  it(`getPlatform() should pass to device driver`, async () => {
    device = validDevice();
    device.getPlatform();

    expect(device.deviceDriver.getPlatform).toHaveBeenCalledTimes(1);
  });

  it(`getPlatform() should pass to device driver`, async () => {
    device = validSimulator();
    device.getPlatform();

    expect(device.deviceDriver.getPlatform).toHaveBeenCalledTimes(1);
  });

  it(`_cleanup() should pass to device driver`, async () => {
    device = validDevice();
    await device._cleanup();

    expect(device.deviceDriver.cleanup).toHaveBeenCalledTimes(1);
  });

  it(`new Device() with invalid device config (no binary) should throw`, async () => {
    try {
      new Device(invalidDeviceNoBinary.configurations['ios.sim.release'], validScheme.session, new SimulatorDriver(client));
      fail('should throw');
    } catch (ex) {
      expect(ex).toBeDefined();
    }
  });

  it(`new Device() with invalid device config (no device name) should throw`, async () => {
    try {
      new Device(invalidDeviceNoDeviceName.configurations['ios.sim.release'], validScheme.session, new SimulatorDriver(client));
      fail('should throw');
    } catch (ex) {
      expect(ex).toBeDefined();
    }
  });

  it(`finalizeArtifacts() should call cp`, async () => {
    device = validDevice();
    device.deviceDriver.getLogsPaths = () => ({stdout: '/t1', stderr: '/t2'});
    device.setArtifactsDestination('/tmp');
    await device.finalizeArtifacts();
    expect(sh.cp).toHaveBeenCalledTimes(2);
  });

  it(`finalizeArtifacts() should catch cp exception`, async () => {
    device = validDevice();
    device.deviceDriver.getLogsPaths = () => ({stdout: '/t1', stderr: '/t2'});
    device.setArtifactsDestination('/tmp');
    await device.relaunchApp();
    sh.cp = jest.fn(() => {throw 'exception sent by mocked cp'});
    await device.finalizeArtifacts();
  });

  it(`finalizeArtifacts() should not cp if setArtifactsDestination wasn't called`, async () => {
    device = validDevice();
    device.deviceDriver.getLogsPaths = () => ({stdout: '/t1', stderr: '/t2'});
    await device.relaunchApp();
    await device.finalizeArtifacts();
    expect(sh.cp).toHaveBeenCalledTimes(0);
  });

  it(`launchApp({url:url}) should check if process is in background and use openURL() instead of launch args`, async () => {
    const processId = 1;
    device = validDevice();
    device.deviceDriver.getBundleIdFromBinary.mockReturnValue('test.bundle');
    device.deviceDriver.launch.mockReturnValueOnce(processId).mockReturnValueOnce(processId);

    await device.prepare({launchApp: true});
    await device.launchApp({url: 'url://me'});

    expect(device.deviceDriver.openURL).toHaveBeenCalledTimes(1);
  });

  it(`launchApp({url:url}) should check if process is in background and if not use launch args`, async () => {
    const launchParams = {url: 'url://me'};
    const processId = 1;
    const newProcessId = 2;

    device = validDevice();
    device.deviceDriver.getBundleIdFromBinary.mockReturnValue('test.bundle');
    device.deviceDriver.launch.mockReturnValueOnce(processId).mockReturnValueOnce(newProcessId);

    await device.prepare();
    await device.launchApp(launchParams);

    expect(device.deviceDriver.openURL).toHaveBeenCalledTimes(0);
  });

  it(`launchApp({url:url}) should check if process is in background and use openURL() instead of launch args`, async () => {
    const launchParams = {url: 'url://me'};
    const processId = 1;

    device = validDevice();
    device.deviceDriver.getBundleIdFromBinary.mockReturnValue('test.bundle');
    device.deviceDriver.launch.mockReturnValue(processId);

    await device.prepare({launchApp: true});
    await device.launchApp(launchParams);

    expect(device.deviceDriver.openURL).toHaveBeenCalledTimes(1);
  });

  it(`launchApp({userNotification:userNotification}) should check if process is in background and if it is use sendUserNotification`, async () => {
    const launchParams = {userNotification: 'notification'};
    const processId = 1;

    device = validDevice();
    device.deviceDriver.getBundleIdFromBinary.mockReturnValue('test.bundle');
    device.deviceDriver.launch.mockReturnValueOnce(processId).mockReturnValueOnce(processId);

    await device.prepare({launchApp: true});
    await device.launchApp(launchParams);

    expect(device.deviceDriver.sendUserNotification).toHaveBeenCalledWith(launchParams.userNotification);
  });

  it(`launchApp({userNotification:userNotification}) should check if process is in background and if not use launch args`, async () => {
    const launchParams = {userNotification: 'notification'};
    const processId = 1;
    const newProcessId = 2;

    device = validDevice();
    device.deviceDriver.getBundleIdFromBinary.mockReturnValue('test.bundle');
    device.deviceDriver.launch.mockReturnValueOnce(processId).mockReturnValueOnce(newProcessId);

    await device.prepare();
    await device.launchApp(launchParams);

    expect(device.deviceDriver.sendUserNotification).toHaveBeenCalledTimes(0);
  });
});
