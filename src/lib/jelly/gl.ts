/** Small WebGL2 helpers: programs with their uniform locations, attributes, textures, bakes. */

export interface Program {
  p: WebGLProgram
  u: Record<string, WebGLUniformLocation | null>
}

/**
 * Compile and link every program before asking how any of them went: the GPU process can
 * then build them in parallel (KHR_parallel_shader_compile), so the wait is about the
 * slowest one rather than the sum.
 */
export function compileAll(gl: WebGL2RenderingContext, sources: [vs: string, fs: string][]): Program[] {
  gl.getExtension('KHR_parallel_shader_compile')
  const mk = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
  }
  const built = sources.map(([vs, fs]) => {
    const p = gl.createProgram()!
    const v = mk(gl.VERTEX_SHADER, vs), f = mk(gl.FRAGMENT_SHADER, fs)
    gl.attachShader(p, v)
    gl.attachShader(p, f)
    gl.linkProgram(p)
    return { p, v, f }
  })
  return built.map(({ p, v, f }) => {
    if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
      const log = [v, f].map((sh) => gl.getShaderInfoLog(sh)).filter(Boolean).join('\n')
      throw new Error('Shader error: ' + (log || gl.getProgramInfoLog(p)))
    }
    gl.deleteShader(v)
    gl.deleteShader(f)
    const u: Program['u'] = {}
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(p, i)
      if (info) u[info.name] = gl.getUniformLocation(p, info.name)
    }
    return { p, u }
  })
}

/** A float attribute buffer bound into `vao` (instanced when `divisor` is 1). */
export function attr(
  gl: WebGL2RenderingContext,
  prog: Program,
  vao: WebGLVertexArrayObject,
  name: string,
  size: number,
  data: Float32Array,
  usage: number = gl.STATIC_DRAW,
  divisor = 0,
) {
  gl.bindVertexArray(vao)
  const buf = gl.createBuffer()!
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, data, usage)
  const loc = gl.getAttribLocation(prog.p, name)
  if (loc >= 0) {
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0)
    if (divisor) gl.vertexAttribDivisor(loc, divisor)
  }
  return buf
}

/** Upload a canvas (straight alpha) with mipmaps and anisotropic filtering. */
export function texFrom(gl: WebGL2RenderingContext, src: TexImageSource, tex?: WebGLTexture | null) {
  const t = tex || gl.createTexture()!
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)
  gl.generateMipmap(gl.TEXTURE_2D)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const ext = gl.getExtension('EXT_texture_filter_anisotropic')
  if (ext) gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, 8)
  return t
}

/** Render a full-screen triangle into `tex` once (the nebula, the mist cloud, the paper grain). */
export function bakeInto(
  gl: WebGL2RenderingContext,
  tex: WebGLTexture,
  w: number,
  h: number,
  prog: Program,
  vao: WebGLVertexArrayObject,
  setUniforms: (u: Program['u']) => void,
  mips = false,
) {
  gl.bindTexture(gl.TEXTURE_2D, tex)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  const fb = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  gl.viewport(0, 0, w, h)
  gl.disable(gl.BLEND)
  gl.disable(gl.DEPTH_TEST)
  gl.useProgram(prog.p)
  setUniforms(prog.u)
  gl.bindVertexArray(vao)
  gl.drawArrays(gl.TRIANGLES, 0, 3)
  gl.bindVertexArray(null)
  gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  gl.deleteFramebuffer(fb)
  if (mips) {
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
  }
}
