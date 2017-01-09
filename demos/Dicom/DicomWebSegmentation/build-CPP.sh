#!/usr/bin/env bash
#cd compilations/ITK-js/
#git clone https://github.com/InsightSoftwareConsortium/ITKAnisotropicDiffusionLBR.git
#mkdir ITKAnisotropicDiffusionLBR-build
#flags='-Wno-warn-absolute-paths --memory-init-file 0 -s DISABLE_EXCEPTION_CATCHING=0 -s ALLOW_MEMORY_GROWTH=1'
flags='-Wno-warn-absolute-paths'

echo "ITK:CMake"
cmake -HITK -BITK-CPP-build  -G Ninja  "-DCMAKE_CXX_FLAGS=$flags" "-DCMAKE_C_FLAGS=$flags" "-DBUILD_EXAMPLES=ON" "-DModule_AnisotropicDiffusionLBR=ON"

echo "ITK:Ninja"
ninja -CITK-CPP-build Modules/ThirdParty/DCMTK/ITKDCMTK_ExtProject
ninja -CITK-CPP-build

echo "LBR:CMake"
#cmake -HITKAnisotropicDiffusionLBR -BITKAnisotropicDiffusionLBR-CPP-build  -G Ninja  "-DCMAKE_CXX_FLAGS=$flags" "-DCMAKE_C_FLAGS=$flags" "-DBUILD_EXAMPLES=ON" "-DModule_AnisotropicDiffusionLBR=ON" "-DCMAKE_BUILD_TYPE=Release" "-DITK_DIR=../ITK-build"
cmake -HITKAnisotropicDiffusionLBR -BITKAnisotropicDiffusionLBR-CPP-build  -G Ninja   "-DCMAKE_BUILD_TYPE=Release" "-DCMAKE_CXX_FLAGS=$flags" "-DCMAKE_C_FLAGS=$flags" "-DITK_DIR=$(pwd)/ITK-CPP-build"

echo "LBR:Ninja"
ninja -CITKAnisotropicDiffusionLBR-CPP-build
#ninja -CITKAnisotropicDiffusionLBR-build -t clean
