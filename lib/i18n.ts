export const locales=['en','bg'] as const;
export type Locale=typeof locales[number];
export function isLocale(v:string):v is Locale{return locales.includes(v as Locale)}
export const copy={
en:{
topbar:'SELIORA LAUNCH — INTRODUCTORY PRICES COMING SOON',shop:'Shop',story:'Our Story',fit:'Fit Guide',faq:'FAQ',bag:'Bag',
eyebrow:'Modern hosiery',hero:'Hosiery for every body.',lead:'Thoughtfully selected tights for comfort, fit and everyday confidence. No unnecessary labels — just the right feel, finish and fit.',
shopCta:'Shop collection',fitCta:'Find your fit',collection:'First collection',collectionTitle:'Everyday essentials, refined.',collectionNote:'A focused first line, selected for finish, comfort and reliable fit. Final products will be confirmed after sample testing.',
benefits:[['Soft feel','Selected for comfort against the skin.'],['Comfort stretch','Fit that moves naturally with you.'],['Considered fit','Size by measurements, not assumptions.'],['Selected quality','Products tested before joining the collection.']],
point:'Our point of view',pointTitle:'Fit, feel and style come first.',pointBody:'Tights have traditionally been divided into categories before anyone asks how they actually feel to wear. SELIORA starts with the product: finish, comfort, fit and confidence.',
editorialTitle:'Quietly inclusive. Clearly refined.',editorialBody:'Our first visual language stays discreet and product-led. Inclusive by design, without turning identity into a marketing device.',
wear:'Wear what feels right.',launch:'Launch collection',launchBadge:'Introductory pricing planned for the first release.',
footerAbout:'Modern hosiery focused on fit, feel and style — without unnecessary labels.',
productTest:'Products are placeholders until physical sample approval.'
},
bg:{
topbar:'SELIORA СТАРТ — ВЪВЕЖДАЩИ ЦЕНИ ОЧАКВАЙТЕ СКОРО',shop:'Магазин',story:'За SELIORA',fit:'Размери',faq:'Въпроси',bag:'Кошница',
eyebrow:'Модерен hosiery бранд',hero:'Hosiery за всяко тяло.',lead:'Внимателно подбрани чорапогащници за комфорт, добро прилягане и увереност всеки ден. Без излишни етикети — само правилното усещане, финиш и размер.',
shopCta:'Виж колекцията',fitCta:'Намери своя размер',collection:'Първа колекция',collectionTitle:'Ежедневни модели, усъвършенствани.',collectionNote:'Фокусирана стартова линия, подбрана по финиш, комфорт и надеждно прилягане. Финалните продукти ще бъдат потвърдени след тест на мострите.',
benefits:[['Меко усещане','Подбрани за комфорт върху кожата.'],['Еластичен комфорт','Прилягане, което следва движението.'],['Премерен fit','Размер според мерки, не според предположения.'],['Подбрано качество','Всеки модел се тества преди да влезе в колекцията.']],
point:'Нашата гледна точка',pointTitle:'Fit, усещане и стил на първо място.',pointBody:'Чорапогащниците често се делят по категории, преди някой да попита как се усещат при носене. SELIORA започва от самия продукт: финиш, комфорт, прилягане и увереност.',
editorialTitle:'Дискретно инклузивна. Видимо изчистена.',editorialBody:'В началото визуалният език остава дискретен и ориентиран към продукта. Инклузивността е част от дизайна, без да се превръща в натрапчив маркетингов ход.',
wear:'Носи това, което ти е удобно.',launch:'Стартова колекция',launchBadge:'Планирани въвеждащи цени за първото пускане.',
footerAbout:'Модерен hosiery бранд с фокус върху fit, усещане и стил — без излишни етикети.',
productTest:'Продуктите са примерни до одобрение на физическите мостри.'
}
} as const;
