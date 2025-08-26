
import * as d3 from "d3"


export function getLessonMinute(timeStr) {
    let ms = timeStr.split(":")
    return parseInt(ms[0])
}

export const length = (path) => d3.create("svg:path").attr("d", path).node().getTotalLength()

// 颜色工具函数
export const hexToRgba = (hex, alpha) => {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
}

// 向 xAPI LRS 发送数据存储请求
export async function sendToLRS(xapiData) {
    const endpoint = 'https://dialogue.lrs.io/xapi/statements';
    const username = '593a9030-bd6a-4531-b12c-d243d5b4acfc';
    const password = '42116cd6-647d-4e4c-88ba-62b98dd88a40';
    const auth = btoa(`${username}:${password}`);

    const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(xapiData)
    });
    if (!res.ok) {
        throw new Error(`LRS请求失败: ${res.status} ${res.statusText}`);
    }
    return res.json();
}
