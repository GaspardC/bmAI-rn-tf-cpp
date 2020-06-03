// AUTOGENERATED FILE - DO NOT MODIFY!
// This file generated by Djinni from helloworld.djinni

#include "NativeHelloWorld.hpp"  // my header
#include "Marshal.hpp"

namespace djinni_generated {

NativeHelloWorld::NativeHelloWorld() : ::djinni::JniInterface<::helloworld::HelloWorld, NativeHelloWorld>("com/rncpp/helloworld/HelloWorld$CppProxy") {}

NativeHelloWorld::~NativeHelloWorld() = default;


CJNIEXPORT void JNICALL Java_com_rncpp_helloworld_HelloWorld_00024CppProxy_nativeDestroy(JNIEnv* jniEnv, jobject /*this*/, jlong nativeRef)
{
    try {
        DJINNI_FUNCTION_PROLOGUE1(jniEnv, nativeRef);
        delete reinterpret_cast<::djinni::CppProxyHandle<::helloworld::HelloWorld>*>(nativeRef);
    } JNI_TRANSLATE_EXCEPTIONS_RETURN(jniEnv, )
}

CJNIEXPORT jobject JNICALL Java_com_rncpp_helloworld_HelloWorld_00024CppProxy_create(JNIEnv* jniEnv, jobject /*this*/)
{
    try {
        DJINNI_FUNCTION_PROLOGUE0(jniEnv);
        auto r = ::helloworld::HelloWorld::create();
        return ::djinni::release(::djinni_generated::NativeHelloWorld::fromCpp(jniEnv, r));
    } JNI_TRANSLATE_EXCEPTIONS_RETURN(jniEnv, 0 /* value doesn't matter */)
}

CJNIEXPORT jstring JNICALL Java_com_rncpp_helloworld_HelloWorld_00024CppProxy_native_1analyzeImage(JNIEnv* jniEnv, jobject /*this*/, jlong nativeRef, jstring j_photoUri)
{
    try {
        DJINNI_FUNCTION_PROLOGUE1(jniEnv, nativeRef);
        const auto& ref = ::djinni::objectFromHandleAddress<::helloworld::HelloWorld>(nativeRef);
        auto r = ref->analyze_image(::djinni::String::toCpp(jniEnv, j_photoUri));
        return ::djinni::release(::djinni::String::fromCpp(jniEnv, r));
    } JNI_TRANSLATE_EXCEPTIONS_RETURN(jniEnv, 0 /* value doesn't matter */)
}

}  // namespace djinni_generated
