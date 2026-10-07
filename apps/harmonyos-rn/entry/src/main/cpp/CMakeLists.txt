cmake_minimum_required(VERSION 3.13)
project(hybrid_rn)
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_SKIP_BUILD_RPATH TRUE)
set(OH_MODULE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../../oh_modules")
set(RNOH_ROOT "${OH_MODULE_DIR}/@rnoh/react-native-openharmony")
set(RNOH_CPP_DIR "${RNOH_ROOT}/src/main/include")
set(RNOH_APP_DIR "${CMAKE_CURRENT_SOURCE_DIR}")
set(REACT_COMMON_DIR "${RNOH_CPP_DIR}/third-party/rn/ReactCommon")
set(REACT_COMMON_PATCH_DIR "${RNOH_CPP_DIR}/patches/react_native_core")
file(GLOB BOOST_INCLUDE_DIRS "${RNOH_CPP_DIR}/third-party/boost/libs/*/include")
file(GLOB RNOH_SHARED_LIBS "${RNOH_ROOT}/libs/${OHOS_ARCH}/*.so")

# 0.72.140 release HAR 提供预编译核心库；宿主编译 NAPI 入口与三方模块。
add_library(rnoh INTERFACE)
target_include_directories(rnoh INTERFACE
  "${RNOH_CPP_DIR}" "${RNOH_APP_DIR}" "${REACT_COMMON_PATCH_DIR}"
  "${REACT_COMMON_PATCH_DIR}/react/renderer/textlayoutmanager/platform/harmony"
  "${REACT_COMMON_DIR}/react/renderer/graphics/platform/cxx"
  "${REACT_COMMON_DIR}" "${REACT_COMMON_DIR}/jsi" "${REACT_COMMON_DIR}/yoga"
  "${REACT_COMMON_DIR}/callinvoker" "${REACT_COMMON_DIR}/runtimeexecutor"
  "${REACT_COMMON_DIR}/jsiexecutor" "${REACT_COMMON_DIR}/react/nativemodule/core"
  "${RNOH_CPP_DIR}/third-party/folly" "${RNOH_CPP_DIR}/third-party/glog/src"
  "${RNOH_CPP_DIR}/third-party/fmt/include" "${RNOH_CPP_DIR}/third-party/double-conversion"
  ${BOOST_INCLUDE_DIRS})
target_compile_definitions(rnoh INTERFACE NDEBUG C_API_ARCH USE_HERMES=1 RAW_PROPS_ENABLED
  FOLLY_NO_CONFIG=1 FOLLY_MOBILE=1 FOLLY_USE_LIBCPP=1 FOLLY_HAVE_PTHREAD=1 WITH_HITRACE_SYSTRACE)
# release HAR 的 Folly 内联代码依赖优化消除不可达的断言分支。
target_compile_options(rnoh INTERFACE -O2)
target_link_libraries(rnoh INTERFACE ${RNOH_SHARED_LIBS}
  libace_napi.z.so libace_ndk.z.so libhilog_ndk.z.so libhitrace_ndk.z.so
  libnative_vsync.so libnative_drawing.so librawfile.z.so libdeviceinfo_ndk.z.so uv)
add_subdirectory("${OH_MODULE_DIR}/@react-native-oh-tpl/react-native-gesture-handler/src/main/cpp" gesture-handler)
add_subdirectory("${OH_MODULE_DIR}/@react-native-oh-tpl/react-native-safe-area-context/src/main/cpp" safe-area)
file(GLOB GENERATED_CPP "${CMAKE_CURRENT_SOURCE_DIR}/generated/*.cpp")
# 发行 HAR 的 RN headers 必须维持 Release ABI。仅在生成副本中拆开宿主 DevSupport 判断，
# 避免 REACT_NATIVE_DEBUG 同时改变 ShadowNode 等核心类的布局与虚函数。
file(READ "${RNOH_CPP_DIR}/RNOHAppNapiBridge.cpp" RNOH_NAPI_SOURCE)
set(RNOH_DEBUG_CHECK "#ifdef REACT_NATIVE_DEBUG\n  isDebugModeEnabled = true;\n#endif")
string(FIND "${RNOH_NAPI_SOURCE}" "${RNOH_DEBUG_CHECK}" RNOH_DEBUG_CHECK_OFFSET)
string(FIND "${RNOH_NAPI_SOURCE}" "${RNOH_DEBUG_CHECK}" RNOH_DEBUG_CHECK_LAST_OFFSET REVERSE)
if(RNOH_DEBUG_CHECK_OFFSET EQUAL -1 OR NOT RNOH_DEBUG_CHECK_OFFSET EQUAL RNOH_DEBUG_CHECK_LAST_OFFSET)
  message(FATAL_ERROR "RNOH 0.72.140 NAPI dev-mode 结构已变化，请重新核验宿主适配")
endif()
string(REPLACE "${RNOH_DEBUG_CHECK}" "#ifdef HYBRID_RN_DEV_SUPPORT\n  isDebugModeEnabled = true;\n#endif" RNOH_NAPI_SOURCE "${RNOH_NAPI_SOURCE}")
file(WRITE "${CMAKE_CURRENT_BINARY_DIR}/RNOHAppNapiBridge.cpp" "${RNOH_NAPI_SOURCE}")
add_library(rnoh_app SHARED ${GENERATED_CPP} PackageProvider.cpp "${CMAKE_CURRENT_BINARY_DIR}/RNOHAppNapiBridge.cpp" "${RNOH_CPP_DIR}/RNOHOther.cpp")
target_compile_definitions(rnoh_app PRIVATE $<$<CONFIG:Debug>:HYBRID_RN_DEV_SUPPORT>)
target_link_libraries(rnoh_app PUBLIC rnoh rnoh_gesture_handler rnoh_safe_area)
