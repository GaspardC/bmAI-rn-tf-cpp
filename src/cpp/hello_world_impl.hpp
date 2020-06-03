#pragma once

#include "hello_world.hpp"
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>

namespace helloworld {

    class HelloWorldImpl : public helloworld::HelloWorld {

    public:

        // Constructor
        HelloWorldImpl();

        // Our method that returns a string
        std::string analyze_image(const std::string &photoUri);

    };

}