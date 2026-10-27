const fs = require('fs');
const path = require('path');
const {
  IOSConfig,
  withAppDelegate,
  withDangerousMod,
  withInfoPlist,
  withXcodeProject,
} = require('expo/config-plugins');

// iOS 27 traps at launch unless the app adopts the UIScene life cycle, and the SDK 57 template
// doesn't yet (expo/expo#50026). This wires in Expo's own ExpoAppSceneDelegate. All three parts
// are needed; any two still give a black screen:
//   1. Info.plist declares a scene manifest naming our SceneDelegate
//   2. SceneDelegate (a subclass of ExpoAppSceneDelegate) is compiled into the app target
//   3. AppDelegate hands its React Native factory over (ExpoReactNativeFactoryProvider) and stops
//      creating its own window, which UIKit would never show in a scene-based app
// Drop this plugin once the Expo template ships scene support.

const SCENE_DELEGATE = `internal import Expo

// UIScene life cycle (plugins/with-scene-lifecycle.js): creates the window and starts React Native.
class SceneDelegate: ExpoAppSceneDelegate {}
`;

const WINDOW_START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/;

function withSceneManifest(config) {
  return withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });
}

function withFactoryProvider(config) {
  return withAppDelegate(config, (cfg) => {
    if (cfg.modResults.language !== 'swift') {
      throw new Error('with-scene-lifecycle: expected a Swift AppDelegate');
    }
    let src = cfg.modResults.contents;
    if (!src.includes('ExpoReactNativeFactoryProvider')) {
      src = src.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      );
      src = src.replace(
        WINDOW_START,
        '\n    // The scene delegate creates the window and starts React Native (with-scene-lifecycle).\n',
      );
      if (!src.includes('ExpoReactNativeFactoryProvider') || src.includes('UIWindow(frame:')) {
        throw new Error('with-scene-lifecycle: AppDelegate template changed, update the plugin');
      }
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function withSceneDelegateFile(config) {
  config = withDangerousMod(config, [
    'ios',
    (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, cfg.modRequest.projectName);
      fs.writeFileSync(path.join(dir, 'SceneDelegate.swift'), SCENE_DELEGATE);
      return cfg;
    },
  ]);
  return withXcodeProject(config, (cfg) => {
    const name = cfg.modRequest.projectName;
    const file = `${name}/SceneDelegate.swift`;
    if (!cfg.modResults.hasFile(file)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath: file,
        groupName: name,
        project: cfg.modResults,
      });
    }
    return cfg;
  });
}

module.exports = function withSceneLifecycle(config) {
  return withSceneDelegateFile(withFactoryProvider(withSceneManifest(config)));
};
