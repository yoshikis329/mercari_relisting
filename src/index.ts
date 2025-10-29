import webdriver from 'selenium-webdriver';
import https from 'https';
import fs from 'fs';

// 画像をダウンロードする関数
const downloadImage = (url: string, filename: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        https.get(url, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image: ${response.statusCode}`));
                return;
            }

            const file = fs.createWriteStream(filename);
            response.pipe(file);
            
            file.on('finish', () => {
                file.close();
                console.log(`画像をダウンロードしました: ${filename}`);
                resolve();
            });
            
            file.on('error', (err) => {
                fs.unlink(filename, () => {}); // ファイルを削除
                reject(err);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

const main = async (productId: string) => {
    const capabilities = webdriver.Capabilities.chrome();
    capabilities.set('chromeOptions', {
        args: [
            '--headless',
            '--no-sandbox',
            '--disable-gpu',
            '--window-size=1980,1200'
        ]
    });

    const driver = await new webdriver.Builder().withCapabilities(capabilities).build();
    await driver.get(`https://jp.mercari.com/item/${productId}`);

    const itemInfo = await driver.findElement(webdriver.By.id('item-info'));
    // 商品名を取得（通常はh1タグまたはタイトル要素）
    const productName = await itemInfo.findElement(webdriver.By.css('h1')).getText();
    const productDescription = await itemInfo.findElement(webdriver.By.css('pre')).getText();
    console.log(`
        商品名：
        ${productName}


        商品説明：
        ${productDescription}
    `);
    await driver.quit();
    
    // 指定された画像をダウンロード

    for (let i = 1; i <= 20; i++) {
        const imageUrl = `https://static.mercdn.net/item/detail/orig/photos/${productId}_${i}.jpg`;
        const fileName = `product_images/downloaded_image_${i}.jpg`;

        try {
            await downloadImage(imageUrl, fileName);
        } catch (error) {
            console.error('画像のダウンロードに失敗しました:', error);
            continue;
        }
    }
};

main('m23993575259');