// ios/ReactBridge/RCTHelloWorld.m
#import "RCTHelloWorld.h"
#import "HWHelloWorld.h"
@implementation RCTHelloWorld{
  HWHelloWorld *_cppApi;
}
- (RCTHelloWorld *)init
{
  self = [super init];
  _cppApi = [HWHelloWorld create];
  return self;
}

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}
RCT_EXPORT_MODULE();
RCT_REMAP_METHOD(sayHello,
                 uri:(NSString *)uri
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *response = [_cppApi analyzeImage:uri isIos:YES];
  if (response) {
        resolve(response);
    } else {
        reject(@"get_error", @"Error with Dehaze", nil);
    }}
@end
