export async function extractTextFromGoogleDoc(
  body: any[]
) {
  return body
    .map((item) => {
      const paragraph = item.paragraph;

      if (!paragraph) return "";

      return paragraph.elements
        ?.map(
          (el: any) =>
            el.textRun?.content || ""
        )
        .join("");
    })
    .join("\n");
}