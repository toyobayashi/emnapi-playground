#include <stdlib.h>
#include <stdio.h>
#include <assert.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <node_api.h>

typedef struct read_file_request {
  napi_async_work work;
  char* path;
  uint8_t* data;
  size_t size;
  napi_deferred deferred;
} read_file_request;

static void read_file_execute(napi_env env, void* data) {
  read_file_request* request = (read_file_request*) data;
  FILE* fd = fopen(request->path, "r");
  if (fd == NULL) {
    return;
  }
  fseek(fd, 0, SEEK_END);
  request->size = (size_t) ftell(fd);
  fseek(fd, 0, SEEK_SET);
  request->data = (uint8_t*)malloc(request->size);
  size_t r = fread(request->data, 1, request->size, fd);
  assert(r != 0);
  fclose(fd);
}

static void read_file_complete(napi_env env, napi_status status, void* data) {
  read_file_request* request = (read_file_request*) data;
  napi_value ab, u8arr;

  if (status == napi_ok && request->data != NULL) {
#ifdef __wasm
    // Perform copy from wasm to JS
    napi_create_external_arraybuffer(env, request->data, request->size, NULL, NULL, &ab);
#else
    void* data = NULL;
    napi_create_arraybuffer(env, request->size, &data, &ab);
    memcpy(data, request->data, request->size);
#endif
    napi_create_typedarray(env, napi_uint8_array, request->size, ab, 0, &u8arr);
    napi_resolve_deferred(env, request->deferred, u8arr);
  } else {
    napi_value err, msg;
    napi_create_string_utf8(env, "err", NAPI_AUTO_LENGTH, &msg);
    napi_create_error(env, NULL, msg, &err);
    napi_reject_deferred(env, request->deferred, err);
  }
  napi_delete_async_work(env, request->work);
  free(request->path);
  free(request->data);
  free(request);
}

static napi_value read_file_async(napi_env env, napi_callback_info info) {
  size_t argc = 1, path_size = 0;
  napi_value argv, promise, resource_name;
  read_file_request* request = (read_file_request*) malloc(sizeof(read_file_request));
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_string_utf8(env, argv, NULL, 0, &path_size);
  napi_create_promise(env, &request->deferred, &promise);

  request->path = (char*) malloc(path_size + 1);
  request->data = NULL;
  request->size = 0;
  napi_get_value_string_utf8(env, argv, request->path, path_size + 1, &path_size);
  napi_create_string_utf8(env, "read_file_async", NAPI_AUTO_LENGTH, &resource_name);
  napi_create_async_work(env, NULL, resource_name, read_file_execute, read_file_complete, request, &request->work);
  napi_queue_async_work(env, request->work);

  return promise;
}

static napi_value write_file_sync(napi_env env, napi_callback_info info) {
  size_t argc = 2, path_size = 0, content_size = 0;
  napi_value argv[2];
  char path[1024] = { 0 };
  char content[1024] = { 0 };
  napi_get_cb_info(env, info, &argc, argv, NULL, NULL);
  napi_get_value_string_utf8(env, argv[0], path, 1024, &path_size);
  napi_get_value_string_utf8(env, argv[1], content, 1024, &content_size);
  FILE* fd = fopen(path, "w");
  if (fd == NULL) {
    return NULL;
  }
  size_t wrote = fwrite(content, 1, content_size, fd);
  assert(wrote != 0);
  fclose(fd);
  return NULL;
}

static napi_value mkdir_sync(napi_env env, napi_callback_info info) {
  size_t argc = 1, path_size = 0;
  napi_value argv, ret;
  char path[1024] = { 0 };
  napi_get_cb_info(env, info, &argc, &argv, NULL, NULL);
  napi_get_value_string_utf8(env, argv, path, 1024, &path_size);
  int r = mkdir(path, 0755);
  napi_create_int32(env, r, &ret);
  return ret;
}

NAPI_MODULE_INIT() {
  napi_value fn_read_file_async, fn_write_file_sync, fn_mkdir_sync;
  napi_create_function(env, "readFileAsync", NAPI_AUTO_LENGTH, read_file_async, NULL, &fn_read_file_async);
  napi_set_named_property(env, exports, "readFileAsync", fn_read_file_async);

  napi_create_function(env, "writeFileSync", NAPI_AUTO_LENGTH, write_file_sync, NULL, &fn_write_file_sync);
  napi_set_named_property(env, exports, "writeFileSync", fn_write_file_sync);

  napi_create_function(env, "mkdirSync", NAPI_AUTO_LENGTH, mkdir_sync, NULL, &fn_mkdir_sync);
  napi_set_named_property(env, exports, "mkdirSync", fn_mkdir_sync);
  return exports;
}
