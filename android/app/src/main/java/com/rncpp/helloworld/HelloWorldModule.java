 package com.rncpp.helloworld;

 import com.facebook.react.bridge.Promise;
 import com.facebook.react.bridge.ReactApplicationContext;
 import com.facebook.react.bridge.ReactContextBaseJavaModule;
 import com.facebook.react.bridge.ReactMethod;

 public class HelloWorldModule extends ReactContextBaseJavaModule {

     // Add the following lines
     private HelloWorld cppApi; // instance var for our cppApi

     static {
         System.loadLibrary("helloworld"); // load the "helloworld" JNI module
     }

     public HelloWorldModule(ReactApplicationContext reactContext) {
         super(reactContext);
         cppApi = HelloWorld.create(); // create a new instance of our cppApi
     }

     @Override
     public String getName() {
         return "HelloWorld";
     }

     @ReactMethod
     public void sayHello(String photoUri, Promise promise) {
         // call the "getHelloWorld()" method on our C++ class and get the results.
//         String photoUri = "photoUri";
         try {
             String response = cppApi.analyzeImage(photoUri);
             if (!response.isEmpty()) {
                 promise.resolve(response);
             } else {
                 throw new Exception("Error with tennis ball detect");
             }
         } catch (Exception e) {
             promise.reject(e);
         }
     }
 }

