/*=========================================================================
 *
 *  Copyright Insight Software Consortium
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0.txt
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 *
 *=========================================================================*/
//
//
//  Created by Jean-Marie Mirebeau on 20/11/2014.
//
//

#ifndef itkCTThresholdSegmentationCommandLine_h
#define itkCTThresholdSegmentationCommandLine_h

//#include "itkImageFileReader.h"
#include "itkImageSeriesReader.h"
#include "itkImageFileWriter.h"
#include "itkBinaryThresholdImageFilter.h"
#include "itkCastImageFilter.h"
//#include "LinearAnisotropicDiffusionCommandLine.h"
#include "itkTimeProbe.h"
#include "itkPNGImageIOFactory.h"
//#include "itkDCMTKImageIOFactory.h"
#include "itkGDCMImageIOFactory.h"
#include "itkMetaImageIOFactory.h"
#include "itkCommand.h"

#if USE_EMSCRIPTEN
#include "emscripten.h"
#endif // USE_EMSCRIPTEN

/***/

#include <string>
#include <sstream>
#include <vector>

void split(const std::string &s, char delim, std::vector <std::string> &elems) {
    std::stringstream ss;
    ss.str(s);
    std::string item;
    while (std::getline(ss, item, delim)) {
        elems.push_back(item);
    }
}


std::vector <std::string> split(const std::string &s, char delim) {
    std::vector <std::string> elems;
    split(s, delim, elems);
    return elems;
}
/***/


namespace CTThresholdSegmentationCommandLine {

    void Usage() {
        std::cerr <<
                  "Input image filename -     2D and 3D images supported. Required.\n" <<
                  "Output image filename -    Required.\n" <<
                  "Lower threshold -          500.\n" <<
                  "Upper threshold -          1500.\n"
                  << "\n";
    }

    using namespace itk;

    int Execute(int argc, char *argv[]);

    template<int VDimension>
    int Execute(int argc, char *argv[], itk::ImageIOBase::IOComponentType, int nComponents);

    template<int VDimension, typename ScalarType, typename ComponentType>
    int Execute(int argc, char *argv[], int nComponents);

    template<int VDimension, typename PixelType, typename ExportPixelType>
    int Execute(int argc, char *argv[]);

    class EmscriptenProgressUpdate : public itk::Command {
    public:
        itkNewMacro(EmscriptenProgressUpdate);

        void Execute(itk::Object *caller, const itk::EventObject &event) {
            Execute((const itk::Object *) caller, event);
        }

        void Execute(const itk::Object *object, const itk::EventObject &) {
            const int progress = static_cast< int >(100 *
                                                    dynamic_cast<const itk::ProcessObject *>(object)->GetProgress());
#if USE_EMSCRIPTEN
            EM_ASM_ARGS({
              if(typeof FilterWorker !== 'undefined') {
                self.postMessage({'cmd': 'set_progress', 'progress': $0});
              }
              }, progress);
#endif // USE_EMSCRIPTEN
        }
    };


    int Execute(int argc, char *argv[]) {
        using std::cerr;
        using std::endl;
        using namespace itk;

        if (argc < 2 + 1) {
            Usage();
            return EXIT_SUCCESS;
        }

        std::vector <std::string> imageFileNames = split(argv[1], ',');
        const char *imageFileName = imageFileNames[0].c_str();//const char * imageFileName = argv[1];
        std::cout << "Checking type with first file in list:" << imageFileName << "(" << imageFileNames.size() << ")"
                  << std::endl;

        itk::ObjectFactoryBase::RegisterFactory(itk::PNGImageIOFactory::New());
        //itk::ObjectFactoryBase::RegisterFactory(itk::DCMTKImageIOFactory::New());
        itk::ObjectFactoryBase::RegisterFactory(itk::GDCMImageIOFactory::New());
        itk::ObjectFactoryBase::RegisterFactory(itk::MetaImageIOFactory::New());

        itk::ImageIOBase::Pointer imageIO = itk::ImageIOFactory::CreateImageIO(imageFileName,
                                                                               itk::ImageIOFactory::ReadMode);
        if (imageIO.IsNull()) {
            std::cerr << "Could not create ImageIO" << std::endl;
            return EXIT_FAILURE;
        }
        imageIO->SetFileName(imageFileName);
        imageIO->ReadImageInformation();

        const unsigned int imageDimension = imageIO->GetNumberOfDimensions();
        const itk::ImageIOBase::IOComponentType componentType = imageIO->GetComponentType();
        const unsigned int nComponents = imageIO->GetNumberOfComponents();

        std::cout << "imageDimension=" << imageDimension << " componentType=" << componentType << " nComponents="
                  << nComponents << std::endl;

        switch (imageDimension) {
            case 2:
                return Execute<2>(argc, argv, componentType, nComponents);
            case 3:
                return Execute<3>(argc, argv, componentType, nComponents);
            default:
                itkGenericExceptionMacro("Sorry, unsupported image dimension.");
        }
    }

    template<int Dimension>
    int Execute(int argc, char *argv[], itk::ImageIOBase::IOComponentType componentType, int nComponents) {
        switch (componentType) {
            case itk::ImageIOBase::UCHAR:
                return Execute<Dimension, float, unsigned char>(argc, argv, nComponents);
            case itk::ImageIOBase::CHAR:
                return Execute<Dimension, float, char>(argc, argv, nComponents);
            case itk::ImageIOBase::USHORT:
                return Execute<Dimension, float, unsigned short>(argc, argv, nComponents);
            case itk::ImageIOBase::SHORT:
                return Execute<Dimension, float, short>(argc, argv, nComponents);
            case itk::ImageIOBase::UINT:
                return Execute<Dimension, float, unsigned int>(argc, argv, nComponents);
            case itk::ImageIOBase::INT:
                return Execute<Dimension, float, int>(argc, argv, nComponents);
            case itk::ImageIOBase::ULONG:
                return Execute<Dimension, double, unsigned long>(argc, argv, nComponents);
            case itk::ImageIOBase::LONG:
                return Execute<Dimension, double, long>(argc, argv, nComponents);
            case itk::ImageIOBase::FLOAT:
                return Execute<Dimension, float, float>(argc, argv, nComponents);
            case itk::ImageIOBase::DOUBLE:
                return Execute<Dimension, double, double>(argc, argv, nComponents);
            case itk::ImageIOBase::UNKNOWNCOMPONENTTYPE:
            default:
                itkGenericExceptionMacro("Sorry, unsupported component type");
        }
    }

    template<int Dimension, typename ScalarType, typename ComponentType>
    int Execute(int argc, char *argv[], int nComponents) {
        switch (nComponents) {
            case 1:
                return Execute<Dimension, ScalarType, ComponentType>(argc, argv);
//            case 2:
//                return Execute<Dimension, Vector < ScalarType, 2>, Vector < ComponentType, 2 > >
//                                                                                                       (argc, argv);
//            case 3:
//                return Execute<Dimension, Vector < ScalarType, 3>, Vector < ComponentType, 3 > >
//                                                                                                       (argc, argv);
//            case 4:
//                return Execute<Dimension, Vector < ScalarType, 4>, Vector < ComponentType, 4 > >
//                                                                                                       (argc, argv);
            default:
                itkGenericExceptionMacro("Sorry, unsupported number of components");
        }
    }

    template<int Dimension, typename PixelType, typename ExportPixelType>
    int Execute(int argc, char *argv[]) {
        typedef Image <PixelType, Dimension> ImageType;
		typedef Image <ExportPixelType, Dimension> OutputImageType;

        typedef ImageSeriesReader <ImageType> ReaderType;//typedef ImageFileReader<ImageType> ReaderType;
        typename ReaderType::Pointer reader = ReaderType::New();

        std::vector <std::string> imageFileNames = split(argv[1], ',');//const char * imageFileName = argv[1];
        const char *outputFileName = argv[2];

        reader->SetFileNames(imageFileNames);//reader->SetFileName(imageFileName);

        typedef BinaryThresholdImageFilter <ImageType, OutputImageType> SegmentationFilterType;
        typename SegmentationFilterType::Pointer segmentationFilter = SegmentationFilterType::New();
        segmentationFilter->SetInput(reader->GetOutput());

        EmscriptenProgressUpdate::Pointer emscriptenProgress = EmscriptenProgressUpdate::New();
        //segmentationFilter->AddObserver(ProgressEvent(), emscriptenProgress);

        int argIndex = 3;
        if (argIndex < argc) {
            const double diffusionTime = atof(argv[argIndex++]);
            if (diffusionTime == 0) itkGenericExceptionMacro("Error: Unrecognized lower threshold (third argument).\n");
            segmentationFilter->SetLowerThreshold(500);
        }

        if (argIndex < argc) {
            const double lambda = atof(argv[argIndex++]);
            if (lambda == 0.) itkGenericExceptionMacro("Error: Unrecognized upper threshold (fourth argument).\n");
            segmentationFilter->SetUpperThreshold(1500);
        }

        if (argIndex < argc) {
            itkGenericExceptionMacro("Error: excessive number of arguments");
        }
		segmentationFilter->SetInsideValue(127);
		segmentationFilter->SetOutsideValue(0);


        typedef Image <ExportPixelType, Dimension> ExportImageType;
        typedef CastImageFilter <OutputImageType, ExportImageType> CasterType;
        typename CasterType::Pointer caster = CasterType::New();
        caster->SetInput(segmentationFilter->GetOutput());

        //typedef typename SegmentationFilterType::ScalarImageType ScalarImageType;
        typedef ImageFileWriter <ExportImageType> WriterType;
        typename WriterType::Pointer writer = WriterType::New();
        writer->SetInput(caster->GetOutput());
        writer->SetFileName(outputFileName);

        itk::TimeProbe clock;
        clock.Start();
        writer->Update();
        clock.Stop();
        std::cout << "Filtering took: " << clock.GetMean() << " seconds\n";

        return EXIT_SUCCESS;
    }

} // end namespace CTThresholdSegmentationCommandLine

#endif
