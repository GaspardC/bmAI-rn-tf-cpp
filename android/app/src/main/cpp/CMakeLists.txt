# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html

# Sets the minimum version of CMake required to build the native library.

cmake_minimum_required(VERSION 3.4.1)

# Path to the djinni support code
set(support_dir src/djinni/support-lib/jni)
# Path to the generated code and our own c++ implementations
set(include_dirs djinni/cpp/ djinni/jni/ src/cpp/)

# Djinni support code that needs to be compiled
file(
  GLOB_RECURSE support_srcs
  ${support_dir}/*.cpp)
# Generated code and c++ implementations that need to be compiled
file(
  GLOB_RECURSE lib_srcs
  src/djinni/generated/cpp/*.cpp
  src/djinni/generated/jni/*.cpp
  src/main/cpp/*.cpp)

# All the implementation files that make up our library
set(complete_srcs ${support_srcs} ${lib_srcs})

# Define library referring to the sources above
add_library(native-lib SHARED ${complete_srcs})

include_directories(${OpenCV_DIR}/jni/include)
add_library( lib_opencv SHARED IMPORTED )
set_target_properties(lib_opencv PROPERTIES IMPORTED_LOCATION ${OpenCV_DIR}/libs/${ANDROID_ABI}/libopencv_java4.so)

# Creates and names a library, sets it as either STATIC
# or SHARED, and provides the relative paths to its source code.
# You can define multiple libraries, and CMake builds them for you.
# Gradle automatically packages shared libraries with your APK.

add_library( # Sets the name of the library.
        # native-lib
        ${include_dirs}
        ${support_dir}

        # Sets the library as a shared library.
        SHARED

        # Provides a relative path to your source file(s).
        #native-lib.cpp

        )



# Searches for a specified prebuilt library and stores the path as a
# variable. Because CMake includes system libraries in the search path by
# default, you only need to specify the name of the public NDK library
# you want to add. CMake verifies that the library exists before
# completing its build.

find_library( # Sets the name of the path variable.
        log-lib

        # Specifies the name of the NDK library that
        # you want CMake to locate.
        log)

# Specifies libraries CMake should link to your target library. You
# can link multiple libraries, such as libraries you define in this
# build script, prebuilt third-party libraries, or system libraries.

target_link_libraries( # Specifies the target library.
        native-lib

        lib_opencv


        # Links the target library to the log library
        # included in the NDK.
        ${log-lib})