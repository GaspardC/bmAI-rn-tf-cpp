#pragma once

#include "hello_world.hpp"
#include <opencv2/core.hpp>
#include <opencv2/imgproc.hpp>
#include <opencv2/highgui.hpp>

#include <iostream>
#include <tuple>
#include <math.h>
#include <functional>
#include <algorithm>

using namespace std;
using namespace cv;

namespace helloworld
{

    class HelloWorldImpl : public helloworld::HelloWorld
    {

    public:
        // Constructor
        HelloWorldImpl();

        // Our method that returns a string
        std::string analyze_image(const std::string &photoUri);
    };

} // namespace helloworld