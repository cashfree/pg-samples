import UIKit
import ObjectiveC.runtime
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ReactNativeDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    UIViewController.enableFullScreenPresentationWorkaround()

    let delegate = ReactNativeDelegate()
    let factory = RCTReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

    window = UIWindow(frame: UIScreen.main.bounds)

    factory.startReactNative(
      withModuleName: "CashfreeHybridApp",
      in: window,
      launchOptions: launchOptions
    )

    return true
  }
}

extension UIViewController {
  private static let cashfreeFullScreenSwizzle: Void = {
    let originalSelector = #selector(
      UIViewController.present(_:animated:completion:)
    )
    let swizzledSelector = #selector(
      UIViewController.cf_present(_:animated:completion:)
    )

    guard
      let originalMethod = class_getInstanceMethod(
        UIViewController.self,
        originalSelector
      ),
      let swizzledMethod = class_getInstanceMethod(
        UIViewController.self,
        swizzledSelector
      )
    else {
      return
    }

    method_exchangeImplementations(originalMethod, swizzledMethod)
  }()

  static func enableFullScreenPresentationWorkaround() {
    _ = cashfreeFullScreenSwizzle
  }

  // iOS defaults many custom controllers to a page sheet.
  // Force those modals to full screen so Cashfree checkout fills the device.
  @objc private func cf_present(
    _ viewControllerToPresent: UIViewController,
    animated flag: Bool,
    completion: (() -> Void)? = nil
  ) {
    if UIDevice.current.userInterfaceIdiom == .phone,
       !(viewControllerToPresent is UIAlertController),
       viewControllerToPresent.modalPresentationStyle == .automatic ||
        viewControllerToPresent.modalPresentationStyle == .pageSheet ||
        viewControllerToPresent.modalPresentationStyle == .formSheet {
      viewControllerToPresent.modalPresentationStyle = .fullScreen
    }

    cf_present(viewControllerToPresent, animated: flag, completion: completion)
  }
}

class ReactNativeDelegate: RCTDefaultReactNativeFactoryDelegate {
  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
