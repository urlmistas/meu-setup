export async function resizeImage(file,{square=false}={}) {
  if (!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>15*1024*1024) {
    throw new Error('Escolha uma imagem JPG, PNG ou WebP de até 15 MB.')
  }
  let bitmap
  try {
    bitmap=await createImageBitmap(file)
  } catch {
    throw new Error('Não foi possível abrir essa imagem.')
  }
  try {
    const canvas=document.createElement('canvas')
    const context=canvas.getContext('2d')
    if (square) {
      const side=Math.min(bitmap.width,bitmap.height)
      canvas.width=canvas.height=Math.min(320,side)
      context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,canvas.width,canvas.height)
    } else {
      const scale=Math.min(1,960/bitmap.width,540/bitmap.height)
      canvas.width=Math.max(1,Math.round(bitmap.width*scale))
      canvas.height=Math.max(1,Math.round(bitmap.height*scale))
      context.drawImage(bitmap,0,0,canvas.width,canvas.height)
    }
    return canvas.toDataURL('image/webp',.78)
  } finally {
    bitmap.close()
  }
}
