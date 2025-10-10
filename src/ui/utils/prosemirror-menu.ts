import { Schema } from 'prosemirror-model'
import { toggleMark, setBlockType, wrapIn } from 'prosemirror-commands'
import { undo, redo } from 'prosemirror-history'
import { MenuItem, Dropdown, MenuElement } from 'prosemirror-menu'

// 图标定义
const icons = {
  strong: '𝐁',
  em: '𝐼',
  code: '⌜⌝',
  undo: '↶',
  redo: '↷',
  bullet_list: '• ‣ ◦',
  ordered_list: '1. 2. 3.',
  blockquote: '❝❞',
  h1: 'H1',
  h2: 'H2',
  h3: 'H3',
  paragraph: '¶'
}

// 创建菜单项
function cmdItem(cmd: any, options: any) {
  const passedOptions = {
    label: options.title,
    run: cmd,
    ...options
  }
  
  // 确保 enable 函数存在且正确
  if (!options.enable && !options.select) {
    passedOptions.enable = (state: any) => {
      try {
        return cmd(state)
      } catch (error) {
        return false
      }
    }
  }
  
  return new MenuItem(passedOptions)
}

// 创建标记切换菜单项
function markActive(state: any, type: any) {
  const { from, $from, to, empty } = state.selection
  if (empty) return type.isInSet(state.storedMarks || $from.marks())
  else return state.doc.rangeHasMark(from, to, type)
}

function markItem(markType: any, options: any) {
  const passedOptions = {
    active(state: any) { return markActive(state, markType) },
    enable(state: any) { 
      try {
        return toggleMark(markType)(state)
      } catch (error) {
        return false
      }
    },
    ...options
  }
  return cmdItem(toggleMark(markType), passedOptions)
}

// 创建块类型菜单项
function blockTypeItem(nodeType: any, options: any) {
  const command = setBlockType(nodeType)
  const passedOptions = {
    run: command,
    enable(state: any) { return command(state) },
    active(state: any) {
      const { $from, to, node } = state.selection
      if (node) return node.hasMarkup(nodeType, options.attrs)
      return to <= $from.end() && $from.parent.hasMarkup(nodeType, options.attrs)
    },
    ...options
  }
  return new MenuItem(passedOptions)
}

// 创建包装菜单项
function wrapItem(nodeType: any, options: any) {
  const command = wrapIn(nodeType, options.attrs)
  const passedOptions = {
    run: command,
    enable(state: any) { return command(state) },
    active(state: any) {
      const { $from, to } = state.selection
      let depth = $from.sharedDepth(to)
      let parent = $from.node(depth)
      return parent && parent.type === nodeType && 
             (!options.attrs || parent.hasMarkup(nodeType, options.attrs))
    },
    ...options
  }
  return new MenuItem(passedOptions)
}

// 构建菜单项
export function buildMenuItems(schema: Schema) {
  const result: { [key: string]: MenuElement } = {}
  
  // 撤销/重做
  result.undo = cmdItem(undo, { 
    title: '撤销', 
    label: icons.undo,
    enable: (state: any) => undo(state)
  })
  result.redo = cmdItem(redo, { 
    title: '重做', 
    label: icons.redo,
    enable: (state: any) => redo(state)
  })
  
  // 文本标记
  if (schema.marks.strong) {
    result.toggleStrong = markItem(schema.marks.strong, {
      title: '加粗',
      label: icons.strong
    })
  }
  
  if (schema.marks.em) {
    result.toggleEm = markItem(schema.marks.em, {
      title: '斜体',
      label: icons.em
    })
  }
  
  if (schema.marks.code) {
    result.toggleCode = markItem(schema.marks.code, {
      title: '行内代码',
      label: icons.code
    })
  }
  
  // 段落和标题
  if (schema.nodes.paragraph) {
    result.makeParagraph = blockTypeItem(schema.nodes.paragraph, {
      title: '普通段落',
      label: icons.paragraph
    })
  }
  
  if (schema.nodes.heading) {
    for (let i = 1; i <= 3; i++) {
      result[`makeHead${i}`] = blockTypeItem(schema.nodes.heading, {
        title: `标题 ${i}`,
        label: icons[`h${i}` as keyof typeof icons],
        attrs: { level: i }
      })
    }
  }
  
  // 列表
  if (schema.nodes.bullet_list) {
    result.wrapBulletList = wrapItem(schema.nodes.bullet_list, {
      title: '无序列表',
      label: icons.bullet_list
    })
  }
  
  if (schema.nodes.ordered_list) {
    result.wrapOrderedList = wrapItem(schema.nodes.ordered_list, {
      title: '有序列表',
      label: icons.ordered_list
    })
  }
  
  // 引用
  if (schema.nodes.blockquote) {
    result.wrapBlockQuote = wrapItem(schema.nodes.blockquote, {
      title: '引用',
      label: icons.blockquote
    })
  }
  
  // 创建完整菜单数组
  const fullMenu: MenuElement[][] = [
    [result.undo, result.redo].filter(Boolean),
    [result.toggleStrong, result.toggleEm, result.toggleCode].filter(Boolean),
    [result.makeParagraph, result.makeHead1, result.makeHead2, result.makeHead3].filter(Boolean),
    [result.wrapBulletList, result.wrapOrderedList, result.wrapBlockQuote].filter(Boolean)
  ].filter(group => group.length > 0)
  
  return { ...result, fullMenu }
}