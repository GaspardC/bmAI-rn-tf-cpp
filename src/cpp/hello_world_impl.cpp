#include "hello_world_impl.hpp"
#include <string>

namespace helloworld
{

    std::shared_ptr<HelloWorld> HelloWorld::create()
    {
        return std::make_shared<HelloWorldImpl>();
    }

    HelloWorldImpl::HelloWorldImpl()
    {
    }

    std::string HelloWorldImpl::analyze_image(const std::string &photoUri)
    {
        std::string myString = "C++ says Hello World 6 ! " + photoUri;
        cv::Mat dark_channel;
        // Mat output = Mat::zeros( 120, 350, CV_8UC3 );
        // cout << "Output sentence"
        return myString;
    }
} // namespace helloworld