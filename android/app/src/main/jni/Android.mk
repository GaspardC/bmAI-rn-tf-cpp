# ./android/app/src/main/jni/Android.mk

# Set up paths
LOCAL_PATH := $(call my-dir)
include $(CLEAR_VARS)

# Specify module name for System.loadLibrary() call
LOCAL_MODULE := helloworld
LOCAL_MODULE_SUFFIX := .so
LOCAL_MODULE_CLASS := SHARED_LIBRARIES

# Debug mode
NDK_DEBUG=1

# Specify C++ flags
LOCAL_CPPFLAGS := -std=c++17
LOCAL_CPPFLAGS  := -DWORD
LOCAL_CPPFLAGS := -lopencv_imgcodecs
LOCAL_CPPFLAGS += -lopencv_imgproc
LOCAL_CPPFLAGS := -lopencv_core
LOCAL_CPPFLAGS += -fexceptions
LOCAL_CPPFLAGS += -frtti
LOCAL_CPPFLAGS += -Wall
LOCAL_CPPFLAGS += -Wextra
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../djinni/jni
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../djinni/cpp
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib/jni
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../src/cpp

# Specify source files
LOCAL_SRC_FILES += $(LOCAL_PATH)/../../../../../djinni/jni/NativeHelloWorld.cpp
LOCAL_SRC_FILES += $(wildcard $(LOCAL_PATH)/../../../../../src/cpp/*.cpp)
LOCAL_SRC_FILES += $(wildcard $(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib/jni/*.cpp)
LOCAL_SRC_FILES += $(wildcard $(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib/*.cpp)

# # load opencv
OPENCVROOT:= /Users/Gasp/Library/OpenCV/OpenCV-android-sdk
OPENCV_CAMERA_MODULES:=off
OPENCV_INSTALL_MODULES:=on
OPENCV_LIB_TYPE:=SHARED
OPENCV_INSTALL_MODULES:=on

#LOCAL_LDLIBS := -L$(OPENCVROOT)/sdk/native/libs/x86_64/
#LOCAL_LDLIBS += -lopencv_core
#LOCAL_LDLIBS += -lopencv_imgproc
#LOCAL_LDLIBS += -lopencv_highgui
#LOCAL_LDLIBS += -lopencv_imgcodecs
#LOCAL_LDLIBS += -lopencv_photo
#LOCAL_LDLIBS += -llog

#APP_ALLOW_MISSING_DEPS=true


#LOCAL_SHARED_LIBRARIES += libopencv_core
#LOCAL_SHARED_LIBRARIES += libopencv_contrib libopencv_legacy libopencv_ml libopencv_stitching libopencv_nonfree libopencv_objdetect libopencv_videostab libopencv_calib3d libopencv_photo libopencv_video libopencv_features2d libopencv_highgui libopencv_androidcamera libopencv_flann libopencv_imgproc libopencv_ts libopencv_core
include ${OPENCVROOT}/sdk/native/jni/OpenCV.mk


LOCAL_MODULE := helloworld

# Specify C++ flags
LOCAL_CPPFLAGS := -std=c++17
LOCAL_CPPFLAGS += -lopencv_imgcodecs
LOCAL_CPPFLAGS += -fexceptions
LOCAL_CPPFLAGS += -frtti
LOCAL_CPPFLAGS += -Wall
LOCAL_CPPFLAGS += -Wextra
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../djinni/jni
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../djinni/cpp
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib/jni
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib
LOCAL_CPPFLAGS += -I$(LOCAL_PATH)/../../../../../src/cpp


# Specify source files
LOCAL_SRC_FILES += $(LOCAL_PATH)/../../../../../djinni/jni/NativeHelloWorld.cpp
LOCAL_SRC_FILES += $(wildcard $(LOCAL_PATH)/../../../../../src/cpp/*.cpp)
LOCAL_SRC_FILES += $(wildcard $(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib/jni/*.cpp)
LOCAL_SRC_FILES += $(wildcard $(LOCAL_PATH)/../../../../../node_modules/djinni/support-lib/*.cpp)


# Telling make to build the library
include $(BUILD_SHARED_LIBRARY)