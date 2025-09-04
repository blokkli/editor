<template>
  <div>
    <div class="bk-clipboard-upload">
      <input type="file" @change="onFileInput" />
      <div class="bk-button bk-is-primary">
        <Icon name="upload" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '#blokkli/components'
// import { extractText, getDocumentProxy } from 'unpdf'

const onFileInput = (e: Event) => {
  // e.preventDefault()
  // if (e.target instanceof HTMLInputElement) {
  //   const files = e.target.files
  //   if (files) {
  //     handleFiles(files)
  //   }
  // }
}
function handleFiles(data: DataTransfer | FileList) {
  // if (!FileReader) {
  //   return
  // }
  //
  // const files = data instanceof DataTransfer ? [...data.files] : [...data]
  //
  // files.forEach((file) => {
  //   const fr = new FileReader()
  //   fr.onload = async function (ev) {
  //     const buffer = await file.arrayBuffer()
  //     const pdf = await getDocumentProxy(buffer)
  //     const page = await pdf.getPage(1)
  //     const tree = await page.getTextContent()
  //     console.log(tree)
  //     const extracted = await extractText(pdf, { mergePages: true })
  //     console.log(extracted.text)
  //   }
  //   fr.readAsDataURL(file)
  // })
}
</script>
