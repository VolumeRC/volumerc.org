#include "itkImageFileReader.h"
#include "itkImageFileWriter.h"
#include "itkResampleImageFilter.h"
#include "itkRescaleIntensityImageFilter.h"
#include "itkNearestNeighborInterpolateImageFunction.h"
#include "itkTimeProbe.h"
#include "itkRGBPixel.h"
#include "itkRGBAPixel.h"
#include "itkPNGImageIOFactory.h"
//#include "itkDCMTKImageIOFactory.h"
#include "itkGDCMImageIOFactory.h"


/** Convert the input image to a PNG and resample it for display. */
template<typename TInputPixelType, typename TOutputPixelType>
int ConvertAndResample(char *inputFileName, char *outputFileName) {
    std::cout << "Convert and resample..." << std::endl;
    itk::TimeProbe clock;
    clock.Start();

    const unsigned int InputDimension = 2;
    const unsigned int OutputDimension = 2;

    const itk::SizeValueType width = 320;

    typedef TInputPixelType InputPixelType;
    typedef TOutputPixelType OutputPixelType;

    typedef itk::Image <InputPixelType, InputDimension> InputImageType;
    typedef itk::Image <OutputPixelType, OutputDimension> OutputImageType;

    typedef itk::ImageFileReader <InputImageType> ReaderType;
    typename ReaderType::Pointer reader = ReaderType::New();
    reader->SetFileName(inputFileName);

    try {
        reader->UpdateOutputInformation();
    }
    catch (itk::ExceptionObject &error) {
        std::cerr << "Error: " << error << std::endl;
        return EXIT_FAILURE;
    }
    typename InputImageType::ConstPointer inputImage = reader->GetOutput();

    typedef itk::ResampleImageFilter <InputImageType, OutputImageType> ResamplerType;
    typename ResamplerType::Pointer resampler = ResamplerType::New();
    resampler->SetInput(reader->GetOutput());

    const typename InputImageType::SizeType inputSize = inputImage->GetLargestPossibleRegion().GetSize();
    const typename InputImageType::SpacingType inputSpacing = inputImage->GetSpacing();

    typename InputImageType::SpacingType outputSpacing;
    typename InputImageType::SizeType outputSize;
    outputSize[1] = width;
    outputSpacing[1] = (inputSpacing[1] * inputSize[1]) / outputSize[1];
    outputSpacing[0] = outputSpacing[1];
    outputSize[0] = (inputSpacing[0] * inputSize[0]) / outputSpacing[0];
    resampler->SetSize(outputSize);
    resampler->SetOutputSpacing(outputSpacing);

    resampler->SetOutputOrigin(inputImage->GetOrigin());
    resampler->SetOutputDirection(inputImage->GetDirection());

    typedef itk::NearestNeighborInterpolateImageFunction <InputImageType> InterpolatorType;
    typename InterpolatorType::Pointer interpolator = InterpolatorType::New();
    resampler->SetInterpolator(interpolator);

    //typedef itk::RescaleIntensityImageFilter< InputImageType, OutputImageType > RescalerType;
    //typename RescalerType::Pointer rescaler = RescalerType::New();
    //rescaler->SetInput( resampler->GetOutput() );

    typedef itk::ImageFileWriter <OutputImageType> WriterType;
    typename WriterType::Pointer writer = WriterType::New();
    writer->SetFileName(outputFileName);
    //writer->SetInput( rescaler->GetOutput() );
    writer->SetInput(resampler->GetOutput());

    try {
        writer->UpdateLargestPossibleRegion();
    }
    catch (itk::ExceptionObject &error) {
        std::cerr << "Error: " << error << std::endl;
        return EXIT_FAILURE;
    }
    clock.Stop();
    std::cout << "Conversion took: " << clock.GetMean() << " seconds\n";

    return EXIT_SUCCESS;
}


extern "C"
{


/** Convert the input image to a PNG and resample it for display. */
int ConvertAndResample(char *inputFileName, char *outputFileName) {
    try {
        itk::ObjectFactoryBase::RegisterFactory(itk::PNGImageIOFactory::New());
        //itk::ObjectFactoryBase::RegisterFactory( itk::DCMTKImageIOFactory::New() );
        itk::ObjectFactoryBase::RegisterFactory(itk::GDCMImageIOFactory::New());

        itk::ImageIOBase::Pointer imageIO = itk::ImageIOFactory::CreateImageIO(inputFileName,
                                                                               itk::ImageIOFactory::ReadMode);
        if (imageIO.IsNull()) {
            std::cerr << "Could not create ImageIO" << std::endl;
            return EXIT_FAILURE;
        }
        imageIO->SetFileName(inputFileName);
        imageIO->ReadImageInformation();

        const unsigned int nComponents = imageIO->GetNumberOfComponents();

        switch (nComponents) {
            case 1:
                switch (imageIO->GetComponentType()) {
                    case itk::ImageIOBase::UCHAR:
                        return ConvertAndResample<unsigned char, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::CHAR:
                        return ConvertAndResample<char, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::USHORT:
                        return ConvertAndResample<unsigned short, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::SHORT:
                        return ConvertAndResample<short, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::UINT:
                        return ConvertAndResample<unsigned int, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::INT:
                        return ConvertAndResample<int, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::ULONG:
                        return ConvertAndResample<unsigned long, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::LONG:
                        return ConvertAndResample<long, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::FLOAT:
                        return ConvertAndResample<float, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::DOUBLE:
                        return ConvertAndResample<double, unsigned char>(inputFileName, outputFileName);
                    case itk::ImageIOBase::UNKNOWNCOMPONENTTYPE:
                    default:
                        std::cerr << "Sorry, unsupported component type." << std::endl;
                        return EXIT_FAILURE;
                }
            case 3:
                return ConvertAndResample<itk::RGBPixel<unsigned char>, itk::RGBAPixel<unsigned char> >(inputFileName, outputFileName);
            case 4:
                return ConvertAndResample<itk::RGBAPixel<unsigned char>, itk::RGBAPixel<unsigned char> >(inputFileName, outputFileName);
            default:
                std::cerr << "Sorry, unsupported number of components." << std::endl;
                return EXIT_FAILURE;
        }
    }
    catch (itk::ExceptionObject &error) {
        std::cerr << "Error: " << error << std::endl;
        return EXIT_FAILURE;
    }
}

} // end extern "C"

