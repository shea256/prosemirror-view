const {doc, p, img} = require("prosemirror-model/test/build")
const {Plugin} = require("prosemirror-state")
const {tempEditor} = require("./view")
const {DecorationSet, Decoration} = require("../dist")
const ist = require("ist")

describe("nodeViews prop", () => {
  it("can replace a node's representation", () => {
    let view = tempEditor({doc: doc(p("foo", img)),
                           nodeViews: {image() { return {dom: document.createElement("var")}}}})
    ist(view.content.querySelector("var"))
    ist(!view.content.querySelector("img"))
  })

  it("can override drawing of a node's content", () => {
    let view = tempEditor({
      doc: doc(p("foo")),
      nodeViews: {paragraph(node) {
        let dom = document.createElement("p")
        dom.textContent = node.textContent.toUpperCase()
        return {dom}
      }}
    })
    ist(view.content.querySelector("p").textContent, "FOO")
    view.dispatch(view.state.tr.insertText("a"))
    ist(view.content.querySelector("p").textContent, "AFOO")
  })

  it("can register its own update method", () => {
    let view = tempEditor({
      doc: doc(p("foo")),
      nodeViews: {paragraph(node) {
        let dom = document.createElement("p")
        dom.textContent = node.textContent.toUpperCase()
        return {dom, update(node) { dom.textContent = node.textContent.toUpperCase(); return true }}
      }}
    })
    let para = view.content.querySelector("p")
    view.dispatch(view.state.tr.insertText("a"))
    ist(view.content.querySelector("p"), para)
    ist(para.textContent, "AFOO")
  })

  it("can provide a contentDOM property", () => {
    let view = tempEditor({
      doc: doc(p("foo")),
      nodeViews: {paragraph() {
        let dom = document.createElement("p")
        return {dom, contentDOM: dom}
      }}
    })
    let para = view.content.querySelector("p")
    view.dispatch(view.state.tr.insertText("a"))
    ist(view.content.querySelector("p"), para)
    ist(para.textContent, "afoo")
  })

  it("has its destroy method called", () => {
    let destroyed = false, view = tempEditor({
      doc: doc(p("foo", img)),
      nodeViews: {image() { return {destroy: () => destroyed = true}}}
    })
    ist(!destroyed)
    view.dispatch(view.state.tr.delete(3, 5))
    ist(destroyed)
  })

  it("can query its own position", () => {
    let get, view = tempEditor({
      doc: doc(p("foo", img)),
      nodeViews: {image(_n, _v, getPos) { get = getPos; return {}}}
    })
    ist(get(), 4)
    view.dispatch(view.state.tr.insertText("a"))
    ist(get(), 5)
  })

  it("has access to outer decorations", () => {
    let plugin = new Plugin({
      state: {
        init() { return null },
        apply(tr, prev) { return tr.getMeta("setDeco") || prev }
      },
      props: {
        decorations(state) {
          let deco = this.getState(state)
          return deco && DecorationSet.create(state.doc, [Decoration.inline(0, state.doc.content.size, null, {name: deco})])
        }
      }
    })
    let view = tempEditor({
      doc: doc(p("foo", img)),
      plugins: [plugin],
      nodeViews: {image(_n, _v, _p, deco) {
        let dom = document.createElement("var")
        function update(deco) {
          dom.textContent = deco.length ? deco[0].options.name : "[]"
        }
        update(deco)
        return {dom, update(_, deco) { update(deco); return true }}
      }}
    })
    ist(view.content.querySelector("var").textContent, "[]")
    view.dispatch(view.state.tr.setMeta("setDeco", "foo"))
    ist(view.content.querySelector("var").textContent, "foo")
    view.dispatch(view.state.tr.setMeta("setDeco", "bar"))
    ist(view.content.querySelector("var").textContent, "bar")
  })
})
