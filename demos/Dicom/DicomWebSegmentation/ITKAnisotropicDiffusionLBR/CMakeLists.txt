cmake_minimum_required(VERSION 2.8)

project(AnisotropicDiffusionLBR_Examples)

find_package(ITK REQUIRED
        COMPONENTS
        AnisotropicDiffusionLBR
        #    ITKIODCMTK
        ITKIOGDCM
        ITKIOMeta
        ITKThresholding
        ITKIOPNG
        ITKImageIntensity
        )
include(${ITK_USE_FILE})

enable_testing()

set(INPUT_DATA_DIR ${ITK_DIR}/ExternalData/Modules/Remote/AnisotropicDiffusionLBR/test/Input)
MESSAGE(STATUS "INPUT_DATA_DIR:${INPUT_DATA_DIR}")
if (NOT EXISTS ${INPUT_DATA_DIR}/PacMan.png)
    message(SEND_ERROR "INPUT_DATA_DIR not found!")
endif ()
set(TEST_OUTPUT_DIR /)
file(MAKE_DIRECTORY ${AnisotropicDiffusionLBR_Examples_BINARY_DIR}/Input)
file(COPY ${INPUT_DATA_DIR}/PacMan.png
        DESTINATION ${AnisotropicDiffusionLBR_Examples_BINARY_DIR}/Input)


#add_executable(CoherenceEnhancingDiffusion
#        CoherenceEnhancingDiffusion.cxx)
#
#add_executable(ConvertAndResample
#        ConvertAndResample.cxx)
#
#add_executable(CTThresholdSegmentation
#        CTThresholdSegmentation.cxx)

MESSAGE(STATUS "CMAKE_SYSTEM_NAME:${CMAKE_SYSTEM_NAME}")

IF (${CMAKE_SYSTEM_NAME} STREQUAL "Emscripten")
add_executable(CTThresholdSegmentationAll
        CTThresholdSegmentation.cxx
        ConvertAndResample.cxx
)


#    target_compile_definitions(CoherenceEnhancingDiffusion PRIVATE USE_EMSCRIPTEN=1)
#    set_target_properties(CoherenceEnhancingDiffusion PROPERTIES LINK_FLAGS
#            "-s NO_EXIT_RUNTIME=1 -s INVOKE_RUN=0 -s MODULARIZE=1 -s EXPORT_NAME=\"'ModuleCE'\" -s EXPORTED_FUNCTIONS=\"['_main']\"")
#    target_link_libraries(CoherenceEnhancingDiffusion
#            ${ITK_LIBRARIES})
#    em_link_pre_js(CoherenceEnhancingDiffusion ${CMAKE_CURRENT_SOURCE_DIR}/js/pre.js)
#
#    target_compile_definitions(ConvertAndResample PRIVATE USE_EMSCRIPTEN=1)
#    set_target_properties(ConvertAndResample PROPERTIES LINK_FLAGS
#            "-s NO_EXIT_RUNTIME=1 -s INVOKE_RUN=0 -s MODULARIZE=1 -s EXPORT_NAME=\"'ModuleCR'\" -s EXPORTED_FUNCTIONS=\"['_ConvertAndResample']\"")
#    target_link_libraries(ConvertAndResample
#            ${ITK_LIBRARIES})
#    em_link_pre_js(ConvertAndResample ${CMAKE_CURRENT_SOURCE_DIR}/js/preCR.js)
#
#    target_compile_definitions(CTThresholdSegmentation PRIVATE USE_EMSCRIPTEN=1)
#    set_target_properties(CTThresholdSegmentation PROPERTIES LINK_FLAGS
#            "-s NO_EXIT_RUNTIME=1 -s INVOKE_RUN=0 -s MODULARIZE=1 -s EXPORT_NAME=\"'ModuleCT'\" -s EXPORTED_FUNCTIONS=\"['_main']\"")
#    target_link_libraries(CTThresholdSegmentation
#            ${ITK_LIBRARIES})
#    em_link_pre_js(CTThresholdSegmentation ${CMAKE_CURRENT_SOURCE_DIR}/js/preCT.js)

    target_compile_definitions(CTThresholdSegmentationAll PRIVATE USE_EMSCRIPTEN=1)
    set_target_properties(CTThresholdSegmentationAll PROPERTIES LINK_FLAGS
            "-s NO_EXIT_RUNTIME=1 -s INVOKE_RUN=0 -s EXPORTED_FUNCTIONS=\"['_main','_ConvertAndResample']\"")
    target_link_libraries(CTThresholdSegmentationAll
            ${ITK_LIBRARIES})
    em_link_pre_js(CTThresholdSegmentationAll ${CMAKE_CURRENT_SOURCE_DIR}/js/pre.js)
ELSE ()
add_executable(CTThresholdSegmentationAll
        CTThresholdSegmentation.cxx
)
add_executable(ConvertAndResample
        ConvertAndResample.cxx
)

#    target_compile_definitions(CoherenceEnhancingDiffusion PRIVATE USE_EMSCRIPTEN=0)
#    target_link_libraries(CoherenceEnhancingDiffusion
#            ${ITK_LIBRARIES})
#
#    target_compile_definitions(ConvertAndResample PRIVATE USE_EMSCRIPTEN=0)
#    target_link_libraries(ConvertAndResample
#            ${ITK_LIBRARIES})
#
#    target_compile_definitions(CTThresholdSegmentation PRIVATE USE_EMSCRIPTEN=0)
#    target_link_libraries(CTThresholdSegmentation
#            ${ITK_LIBRARIES})

    target_compile_definitions(CTThresholdSegmentationAll PRIVATE USE_EMSCRIPTEN=0)
    target_link_libraries(CTThresholdSegmentationAll ${ITK_LIBRARIES})
    target_compile_definitions(ConvertAndResample PRIVATE USE_EMSCRIPTEN=0)
    target_link_libraries(ConvertAndResample ${ITK_LIBRARIES})
ENDIF ()


#add_test(NAME CoherenceEnhancingDiffusionTest
#        COMMAND CoherenceEnhancingDiffusion /Input/PacMan.png
#        ${TEST_OUTPUT_DIR}/PacManFiltered.png
#        20 0.05 cCED 3)
#
#add_test(NAME ConvertAndResampleTest
#        COMMAND ConvertAndResampleTest /Input/PacMan.png
#        ${TEST_OUTPUT_DIR}/PacManConverted.png)
#
#add_test(NAME CTThresholdSegmentationTest
#        COMMAND CTThresholdSegmentation /Input/PacMan.png
#        ${TEST_OUTPUT_DIR}/PacManSegmented.png)

add_test(NAME CTThresholdSegmentationAllTest
        COMMAND CTThresholdSegmentationAll /Input/PacMan.png
        ${TEST_OUTPUT_DIR}/PacManSegmented.png
)
