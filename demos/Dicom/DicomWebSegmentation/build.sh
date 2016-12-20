#cd compilations/ITK-js/
#git clone https://github.com/InsightSoftwareConsortium/ITKAnisotropicDiffusionLBR.git
#mkdir ITKAnisotropicDiffusionLBR-build
flags='-Wno-warn-absolute-paths --memory-init-file 0 -s DISABLE_EXCEPTION_CATCHING=0 -s ALLOW_MEMORY_GROWTH=1'
./dockcross-browser-asmjs cmake -HITK -BITK-build  -G Ninja  "-DCMAKE_CXX_FLAGS=$flags" "-DCMAKE_C_FLAGS=$flags" "-DBUILD_EXAMPLES=ON" "-DModule_AnisotropicDiffusionLBR=ON"
./dockcross-browser-asmjs ninja -CITK-build
#./dockcross-browser-asmjs cmake -HITKAnisotropicDiffusionLBR -BITKAnisotropicDiffusionLBR-build  -G Ninja  "-DCMAKE_CXX_FLAGS=$flags" "-DCMAKE_C_FLAGS=$flags" "-DBUILD_EXAMPLES=ON" "-DModule_AnisotropicDiffusionLBR=ON" "-DCMAKE_BUILD_TYPE=Release" "-DITK_DIR=../ITK-build"
./dockcross-browser-asmjs cmake -HITKAnisotropicDiffusionLBR -BITKAnisotropicDiffusionLBR-build  -G Ninja   "-DCMAKE_BUILD_TYPE=Release" "-DCMAKE_CXX_FLAGS=$flags" "-DCMAKE_C_FLAGS=$flags" "-DITK_DIR=/work/ITK-build"
./dockcross-browser-asmjs ninja -CITKAnisotropicDiffusionLBR-build
mv ITKAnisotropicDiffusionLBR-build/CoherenceEnhancingDiffusion.js ITKAnisotropicDiffusionLBR-build/CoherenceEnhancingDiffusion.2.js
./dockcross-browser-asmjs ninja -CITKAnisotropicDiffusionLBR-build -t clean
