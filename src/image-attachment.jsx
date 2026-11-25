import React, {useEffect,useId,useRef,useState} from 'react'
import {Image01, Upload01, XClose} from '@untitledui/icons'
import {Button,Input} from './ui'
import {resizeImage} from './image-upload'

const webImage=/^https?:\/\//i

export async function resolveImageAttachment(fields, currentImage, options) {
  const file=fields.get('imageFile')
  if (file?.size) return resizeImage(file,options)
  const url=String(fields.get('imageUrl')??'').trim()
  if (url) {
    if (!webImage.test(url)) throw new Error('Informe um link de imagem começando com http:// ou https://.')
    return url
  }
  return !fields.has('removeImage')&&currentImage?.startsWith('data:image/')?currentImage:''
}

export default function ImageAttachment({label,initialImage='',disabled=false}) {
  const inputRef=useRef(null)
  const helpId=useId()
  const [url,setUrl]=useState(webImage.test(initialImage)?initialImage:'')
  const [previewUrl,setPreviewUrl]=useState(url)
  const [file,setFile]=useState(null)
  const [localPreview,setLocalPreview]=useState('')
  const [removed,setRemoved]=useState(false)
  const [failedImage,setFailedImage]=useState('')

  useEffect(()=>{
    if (!file) return
    const src=URL.createObjectURL(file)
    setLocalPreview(src)
    return ()=>URL.revokeObjectURL(src)
  },[file])

  const savedImage=!removed&&initialImage.startsWith('data:image/')?initialImage:''
  const image=file?localPreview:(previewUrl||savedImage)
  const hasAttachment=Boolean(file||url.trim()||savedImage)
  const title=file?.name||(url.trim()?'Imagem por link':'Imagem salva')
  const description=file?`${(file.size/1024).toLocaleString('pt-BR',{maximumFractionDigits:0})} KB`:url.trim()?'Link externo':'Armazenada neste navegador'

  function clearFile() {
    if (inputRef.current) inputRef.current.value=''
    setFile(null)
    setLocalPreview('')
  }

  function selectFile(event) {
    const selected=event.target.files?.[0]
    if (!selected) return
    setLocalPreview('')
    setFile(selected)
    setUrl('')
    setPreviewUrl('')
    setRemoved(true)
  }

  function clearAttachment() {
    clearFile()
    setUrl('')
    setPreviewUrl('')
    setRemoved(true)
    setFailedImage('')
  }

  return <fieldset className="image-attachment-field" disabled={disabled}>
    <legend>{label}</legend>
    <div className="image-attachment-inputs">
      <Input aria-label="Link direto da imagem" aria-describedby={helpId} name="imageUrl" type="url" maxLength={2048}
        pattern="https?://.+" placeholder="https://…/imagem.jpg" value={url}
        onChange={event=>{
          if (file) clearFile()
          setUrl(event.target.value)
          setRemoved(true)
          setFailedImage('')
        }}
        onBlur={event=>{
          const value=event.currentTarget.value.trim()
          setPreviewUrl(webImage.test(value)?value:'')
        }}/>
      <input hidden type="file" ref={inputRef} name="imageFile" accept="image/jpeg,image/png,image/webp" onChange={selectFile}/>
      <Button type="button" variant="outline" onClick={()=>inputRef.current?.click()}><Upload01 size={15}/> Enviar imagem</Button>
    </div>
    {removed&&<input type="hidden" name="removeImage" value="1"/>}
    {hasAttachment&&<div data-slot="attachment" className="image-attachment" data-state={failedImage&&failedImage===image?'error':'idle'}>
      <div data-slot="attachment-media">
        {image&&failedImage!==image?<img key={image} src={image} alt="" referrerPolicy="no-referrer" onError={()=>setFailedImage(image)}/>:<Image01 size={20}/>}
      </div>
      <div data-slot="attachment-content">
        <span data-slot="attachment-title" title={title}>{title}</span>
        <span data-slot="attachment-description">{failedImage&&failedImage===image?'Prévia indisponível':description}</span>
      </div>
      <div data-slot="attachment-actions">
        <Button type="button" variant="ghost" aria-label="Remover imagem" onClick={clearAttachment}><XClose size={17}/></Button>
      </div>
    </div>}
    <p id={helpId}>Cole o link direto ou selecione um JPG, PNG ou WebP de até 15 MB.</p>
  </fieldset>
}
