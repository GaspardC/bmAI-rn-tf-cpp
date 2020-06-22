#include "hello_world_impl.hpp"
#include <string>
namespace helloworld
{

    template <typename T>
    int sgn(T val)
    {
        return (T(0) < val) - (val < T(0));
    }

    tuple<cv::Mat, float> resize(cv::Mat inputMat, float h_max = 600.0)
    {
        cv::Mat image;
        //    if(inputMat.rows < inputMat.cols){
        //        cv::transpose(inputMat,inputMat);
        //        cv::flip(inputMat, inputMat,1);
        //    };
        float fx = h_max / inputMat.rows;
        cv::resize(inputMat, image, cv::Size(), fx, fx);
        return {image, fx};
    }

    tuple<cv::Mat, cv::Mat, cv::Mat> bgr2lab_polar(const cv::Mat &inputMat)
    {

        int cols = inputMat.cols;
        int rows = inputMat.rows;
        int size = cols * rows;

        cv::Mat labMat;
        cv::cvtColor(inputMat, labMat, cv::COLOR_BGR2Lab);

        auto data = labMat.ptr<uchar>();

        cv::Mat theta = cv::Mat(rows, cols, CV_8U);
        auto *theta_data = theta.ptr<uchar>();

        cv::Mat r = cv::Mat(rows, cols, CV_8U);
        auto *r_data = r.ptr<uchar>();

        cv::Mat l = cv::Mat(rows, cols, CV_8U);
        auto *l_data = l.ptr<uchar>();

        for (uint32_t i = 0; i < size; i++)
        {
            const double inner_l = *data++;
            *l_data++ = inner_l;

            //        //  check that lab value writing correctly -->  YES
            //        const double a = *data++;
            //        const double b = *data++;
            //        *theta_data++ = a;
            //        *r_data++ = b;

            const double a = (*data++ - 128.0);
            const double b = (*data++ - 128.0);
            auto thetaVal = M_PI * (1 - sgn(a + 1e-3)) / 2 + atan(a / (b + 1e-3));
            *theta_data++ = thetaVal;
            *r_data++ = sqrt((double)a * a + b * b - 128);
        }
        //    imshow("L", l);
        //    cv::waitKey();
        //    imshow("theta", theta);
        //    cv::waitKey();
        //    imshow("r", r);
        //    cv::waitKey();

        return {l, theta, r};
    }

    auto get_disk(int radius)
    {
        const int kernerlSize = radius * 2 + 1;

        cv::Mat d = cv::Mat(kernerlSize, kernerlSize, CV_8U);
        auto *data = d.ptr<uchar>();

        for (int index = 0; index < kernerlSize * kernerlSize; index++)
        {
            const int i = index % kernerlSize;
            const int j = round(index / kernerlSize);
            const int test = pow(i - radius, 2);
            const float val = (pow((i - radius), 2) + pow((j - radius), 2) <= pow(radius, 2));
            *data++ = 255.0f * val;
            //        cout << i << "-" << j << " ";
        }
        return d;
        //    imshow("diskimage", d);
        //    cv::waitKey();
    }

    auto get_perimeter(int component, cv::Mat label_image)
    {
        //        """
        //        Computes the perimeter of a given connected component.
        //        :param component: index of the component on which to compute the perimeter.
        //        :param label_image: labeled image w.r.t. each component.
        //        :return: connected component's perimeter.
        //        """
        cv::Mat mask;
        cv::inRange(label_image, component - 10e-3, component + 10e-3, mask);

        vector<cv::Mat> contours;
        cv::findContours(mask, contours, cv::RETR_EXTERNAL, cv::CHAIN_APPROX_NONE);
        return contours.at(0).rows;
    };

    auto get_bounding_box(int component, cv::Mat stats)
    {
        //"""
        //Returns bounding box of a given connected component with same format as used in skimage
        //(min_row, min_col, max_row, max_col).
        //:param component: index of the component on which to compute the bounding box.
        //:param stats: list of statistics for each connected component.
        //:return: connected component's bounding box.
        //"""
        auto min_row = stats.at<int>(cv::CC_STAT_TOP);
        auto min_col = stats.at<int>(cv::CC_STAT_LEFT);
        auto max_row = stats.at<int>(cv::CC_STAT_TOP) + stats.at<int>(cv::CC_STAT_HEIGHT);
        auto max_col = stats.at<int>(cv::CC_STAT_LEFT) + stats.at<int>(cv::CC_STAT_WIDTH);
        vector<int> vect{min_row, min_col, max_row, max_col};

        return vect;

        //min_row = stats[component][cv2.CC_STAT_TOP]
        //min_col = stats[component][cv2.CC_STAT_LEFT]
        //max_row = stats[component][cv2.CC_STAT_TOP] + stats[component][cv2.CC_STAT_HEIGHT]
        //max_col = stats[component][cv2.CC_STAT_LEFT] + stats[component][cv2.CC_STAT_WIDTH]
        //return min_row, min_col, max_row, max_col
    }

    tuple<vector<int>, cv::Mat> find_ball(cv::Mat &img, int radius_min = 15, double score_min = 0.5)
    {
        // Define constants
        float area_min = M_PI * pow(radius_min, 2);

        // Get the connected components
        cv::Mat label_image, stats, centroids;
        auto n_components = cv::connectedComponentsWithStats(img, label_image, stats, centroids, 8,
                                                             CV_16U); //CV_16U -CV_32S

        std::vector<float> score;
        for (int component = 0; component < n_components; component++)
        {
            if (stats.at<int>(component, cv::CC_STAT_AREA) < area_min)
            {
                score.push_back(0);
                continue;
            }
            // Get roundness descriptor
            auto perimeter = get_perimeter(component, label_image);
            auto roundness = (4 * M_PI) / (pow(perimeter, 2) / stats.at<int>(component, cv::CC_STAT_AREA));

            // Select sufficiently round components
            if (roundness < score_min)
            {
                score.push_back(0);
            }
            score.push_back(roundness);
        }

        auto max = *max_element(score.begin(), score.end());
        if (max < score_min)
        {
            std::string error = "No valid score: " + std::to_string(max);
            throw error;
        }

        // get the max index
        auto it = std::find(score.begin(), score.end(), max);
        auto id_max = 0;
        if (it != score.end())
        {
            id_max = std::distance(score.begin(), it);
        }
        auto bbox = get_bounding_box(id_max, stats);

        cv::Mat resImg;
        cv::inRange(label_image, id_max - 10e-3, id_max + 10e-3, resImg);
        return {bbox, resImg * 255};
    }

    auto get_bbox_rescaled(vector<int> &bbox, float fx, int img_width, int img_height)
    {
        // Rescale for original image
        vector<int> bbox_re(bbox.size());
        std::transform(bbox.begin(), bbox.end(), bbox_re.begin(),
                       [fx](float a) {
                           return a / fx;
                       }); // end of lambda expression

        // Enlarge bbox with width/height
        bbox_re[0] = bbox_re[0] - bbox[0];
        bbox_re[1] = bbox_re[1] - bbox[1];
        bbox_re[2] = bbox_re[2] + bbox[2];
        bbox_re[3] = bbox_re[3] + bbox[3];

        //(min_row, min_col, max_row, max_col).
        // Limit to bbox of original image
        bbox_re[0] = max(0, bbox_re[0]);
        bbox_re[1] = max(0, bbox_re[1]);
        bbox_re[2] = min(img_height, bbox_re[2]);
        bbox_re[3] = min(img_width, bbox_re[3]);
        return bbox_re;
    }

    int select_point_x(cv::Point i) { return i.x; };

    int select_point_y(cv::Point i) { return i.y; };

    template <class InputIt, class T>
    constexpr // since C++20
        T
        accumulate(InputIt first, InputIt last, T init)
    {
        for (; first != last; ++first)
        {
            init = std::move(init) + *first; // std::move since C++20
        }
        return init;
    }

    auto get_fitting_ellipse(cv::Mat &edge)
    {
        //    The function will return first lines then column -> Y, X

        //    imshow("edge", edge);
        //    cv::waitKey();

        vector<cv::Point> locations; // output, locations of non-zero pixels
        cv::findNonZero(edge, locations);

        vector<float> X(locations.size());
        vector<float> Y(locations.size());

        std::transform(locations.begin(), locations.end(), X.begin(), select_point_x);
        std::transform(locations.begin(), locations.end(), Y.begin(), select_point_y);

        auto x_mean = accumulate(std::begin(X), std::end(X), 0.0) / X.size();
        auto y_mean = accumulate(std::begin(Y), std::end(Y), 0.0) / Y.size();

        for (int i = 0; i < X.size(); i++)
        {
            X[i] -= x_mean;
            Y[i] -= y_mean;
        }
        vector<float> XY;
        XY.insert(XY.end(), X.begin(), X.end());
        XY.insert(XY.end(), Y.begin(), Y.end());

        cv::Mat matXY = cv::Mat(XY).reshape(0, 2);
        //    imshow("matXY", matXY);
        //    cv::waitKey();

        //    auto rotatedRec = cv::fitEllipse(edge);
        cv::Mat S, U, vt; // w in onpencv is s in numpy
        cv::SVD::compute(matXY, S, U, vt);

        auto S0 = S.at<float>(0, 0);
        auto S1 = S.at<float>(0, 1);

        auto U0 = U.row(0);
        auto U1 = U.row(1);
        auto a = sqrt((double)2 / X.size()) * S0 * cv::norm(U0);
        auto b = sqrt((double)2 / X.size()) * S1 * cv::norm(U1);
        vector<double> vect{x_mean, y_mean, a, b};
        return vect;
    }

    auto draw_detection_details(cv::Mat &image_high, float x_mean, float y_mean, float r, float minRow, float minCol,
                                cv::Mat &mask_high)
    {

        // add circle
        cv::circle(image_high, cv::Point(x_mean + minCol, y_mean + minRow), int(r), cv::Scalar(0, 0, 255), 20);
        return image_high;
        // imshow("image_high", image_high);
        // cv::waitKey();
    }

    std::string trim_uri_protocal(const std::string &uri)
    {
        return uri.find_first_of("file://") == std::string::npos ? uri : uri.substr(7);
    }

    string get_result_uri(const std::string &uri)
    {
        std::size_t delimiter = uri.find_last_of(".");
        return uri.substr(0, delimiter) + "_result" + uri.substr(delimiter);
    }

    std::string save_result_image(const cv::Mat &result_image, const std::string &uri)
    {
        // std::vector<int32_t> compression_params = {CV_IMWRITE_PNG_COMPRESSION, 9};
        std::string result_uri = get_result_uri(uri);
        cv::imwrite(trim_uri_protocal(result_uri), result_image);
        return result_uri;
    }

    string launch_detection(const std::string &uri)
    {
        // std::cout << "Starting the tennis ball detection" << std::endl;
        cv::Mat res;
        cv::Mat edges;

        // cv::namedWindow("edges", 1);
        cv::Mat frame;
        //    frame = cv::imread("/Users/Gasp/Development/TennisBall/newCpp/ball_horiz.JPG");
        // frame = cv::imread("/Users/Gasp/Development/TennisBall/newCpp/ball.JPG");
        // frame = cv::imread(trim_uri_protocal(uri));
        frame = cv::imread(uri);
        //  Step 1 resize image to a lower resolution
        auto [image, fx] = resize(frame, 600);

        // Detect ball in hsv -> contour + hue range
        auto [l, theta, r] = bgr2lab_polar(image);

        // Detect ball in hsv -> contour + hue range
        cv::Mat mask_low;
        cv::inRange(theta, cv::Scalar(2.5), cv::Scalar(3.5), mask_low);
        cv::threshold(mask_low, mask_low, 2, 255, cv::THRESH_BINARY);

        cv::Mat maskR;
        cv::threshold(r, maskR, 30, 255, cv::THRESH_BINARY);
        cv::morphologyEx(maskR.mul(mask_low), mask_low, cv::MORPH_CLOSE, get_disk(5));

        // Extract most probable bbox for ball
        auto [_, img_filtered] = find_ball(mask_low);
        auto [bbox, _unsuedImg2] = find_ball(img_filtered);
        auto bbox_re = get_bbox_rescaled(bbox, fx, frame.cols, frame.rows);

        // STEP 2: Process image full resolution for precision
        //(min_row, min_col, max_row, max_col).
        auto roi = cv::Rect(bbox_re[1], bbox_re[0], bbox_re[3] - bbox_re[1], bbox_re[2] - bbox_re[0]);
        cv::Mat image_high(frame, roi);

        auto [l_high, theta_high, r_high] = bgr2lab_polar(image_high);

        cv::compare(theta_high, cv::Scalar(2.3), theta_high, cv::CMP_GT);
        cv::compare(theta_high, cv::Scalar(3.0), theta_high, cv::CMP_LT);
        cv::compare(r_high, cv::Scalar(30), r_high, cv::CMP_GT);

        // Adjust size of disk according to size of original image
        cv::Mat mask_high;
        cv::morphologyEx(r_high, mask_high, cv::MORPH_OPEN, get_disk(2 + (int)floor(image_high.rows / 100)));
        cv::morphologyEx(mask_high, mask_high, cv::MORPH_CLOSE, get_disk(2 + (int)floor(image_high.rows) / 40));

        auto [bboxHigh, imgHigh] = find_ball(mask_high);

        // Get enclosing circle
        cv::Mat edge;
        cv::Canny(imgHigh, edge, 200, 255);

        // x_mean, y_mean, a, b
        auto ellipse_values = get_fitting_ellipse(edge);
        auto x_mean = ellipse_values[0];
        auto y_mean = ellipse_values[1];
        auto a = ellipse_values[2];
        auto b = ellipse_values[3];

        auto radius = sqrt((float)a * b);
        auto imgRes = draw_detection_details(frame, x_mean, y_mean, radius, bbox_re[0], bbox_re[1], mask_high);
        save_result_image(imgRes, uri);

        auto REF_TENNIS_BALL = 6.7 / 2;

        // values to return
        auto value = REF_TENNIS_BALL / (2 * radius);
        vector<double> vect{x_mean, y_mean, a, b};
        auto resStr = "{\"value\":" + to_string(value) + R"(", "x_mean":)" + to_string(x_mean) + R"(", "y_mean":)" + to_string(y_mean) + R"(", "a":)" + to_string(a) + R"(", "b":)" + to_string(b) + "\"}";
        return resStr;
    }

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
        return launch_detection(photoUri);
        // return photoUri;
    }
} // namespace helloworld