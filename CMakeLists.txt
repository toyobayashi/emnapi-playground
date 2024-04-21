cmake_minimum_required(VERSION 3.15)

project(emnapi_playground)

add_subdirectory("${CMAKE_CURRENT_SOURCE_DIR}/node_modules/emnapi")

add_executable(playground src/lib.c)

if(CMAKE_SYSTEM_NAME STREQUAL "Emscripten")
  target_link_options(playground PRIVATE
    "-pthread"
    "-sMODULARIZE=1"
    "-sEXPORT_NAME=emnapiPlayground"
    "-sALLOW_MEMORY_GROWTH=1"
    "-sPTHREAD_POOL_SIZE=4"
    "-sSTACK_SIZE=2MB"
    "-sDEFAULT_PTHREAD_STACK_SIZE=2MB"
    "-sEXPORTED_FUNCTIONS=['_napi_register_wasm_v1','_node_api_module_get_api_version_v1','_malloc','_free']"
    "-sEXPORTED_RUNTIME_METHODS=['FS','NODEFS']"
    "-lnodefs.js"
  )
  target_link_libraries(playground emnapi-mt)
  target_compile_options(playground PRIVATE "-pthread")
elseif(CMAKE_SYSTEM_NAME STREQUAL "WASI")
  set_target_properties(playground PROPERTIES SUFFIX ".wasm")
  target_link_libraries(playground emnapi-basic-mt)
  target_link_options(playground PRIVATE
    "-mexec-model=reactor"
    "-Wl,--export=napi_register_wasm_v1"
    "-Wl,--export-if-defined=node_api_module_get_api_version_v1"
    "-Wl,--import-memory,--shared-memory,--max-memory=2147483648,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
    "-Wl,--export-if-defined=emnapi_async_worker_create,--export-if-defined=emnapi_async_worker_init"
  )
elseif((CMAKE_C_COMPILER_TARGET STREQUAL "wasm32") OR (CMAKE_C_COMPILER_TARGET STREQUAL "wasm32-unknown-unknown"))
  set_target_properties(playground PROPERTIES SUFFIX ".wasm")
  target_link_options(playground PRIVATE
    "-nostdlib"
    "-Wl,--export=napi_register_wasm_v1"
    "-Wl,--export-if-defined=node_api_module_get_api_version_v1"
    "-Wl,--no-entry"
    "-Wl,--import-memory,--shared-memory,--max-memory=2147483648,--export-dynamic,--export=malloc,--export=free,--import-undefined,--export-table"
    "-Wl,--export-if-defined=emnapi_async_worker_create,--export-if-defined=emnapi_async_worker_init"
  )
  target_link_libraries(playground dlmalloc)
endif()
