import type { PublicContentItem } from '../api/content';
import type { Language } from '../i18n';

export type LegalDocumentKey = 'privacy' | 'agreement' | 'permissions';

export interface LegalSection {
  title: string;
  body: string[];
}

export interface LegalDocument {
  key: LegalDocumentKey;
  title: string;
  summary: string;
  updatedAt: string;
  sections: LegalSection[];
}

const UPDATED_AT = '2026-06-22';

const legalDocumentsByLanguage: Record<Language, Record<LegalDocumentKey, LegalDocument>> = {
  cn: {
    privacy: {
    key: 'privacy',
    title: 'TraceCraft 隐私政策',
    summary: '说明我们如何收集、使用、存储、共享和保护你的个人信息，以及你如何管理自己的数据。',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. 我们收集的信息',
        body: [
          '账号信息：当你使用微信、支付宝或手机号登录时，我们会保存第三方授权标识、手机号登录标识、昵称、头像等用于创建和识别账号的信息。',
          '运动与路线信息：为生成和导航跑步路线，我们会处理你选择的模板、上传图片、目标里程、起点、终点、路线点、跑步会话、定位点、速度、距离、偏离状态和完成记录。',
          '设备与运行信息：我们会记录设备类型、系统版本、应用版本、网络状态、错误日志、请求时间、IP 地址和必要的安全审计信息，用于保障服务稳定和账号安全。',
          '社区与互动信息：当你发布作品、评论、点赞、收藏、关注、举报或上传社区图片时，我们会保存相应内容和互动记录。',
        ],
      },
      {
        title: '2. 我们如何使用信息',
        body: [
          '用于提供核心功能，包括图片/模板生成路线、路线预览、风险提示、实时导航、偏离提醒、跑步记录、分享海报、二维码名片和社区展示。',
          '用于账号与安全，包括登录态维护、验证码校验、异常请求识别、接口限流、CSRF 防护、审计日志和必要的风控处理。',
          '用于体验优化，包括记住语言、距离单位、地图服务商、导航偏好、缓存状态和常用模板。',
          '我们不会出售你的个人信息，不会在未取得授权或无合法依据的情况下将精确定位数据用于与 TraceCraft 核心功能无关的广告投放。',
        ],
      },
      {
        title: '3. 位置信息与运动轨迹',
        body: [
          '定位权限只在你创建路线、预览起点、开始导航、上报跑步位置或查看跑步结果时使用。',
          '后台定位仅在你主动开始导航后用于持续记录跑步路线、偏离提醒和完成报告；停止或结束跑步后，我们不再持续采集定位。',
          '你可以在系统设置中关闭定位权限。关闭后，路线生成、实时导航、偏离提醒和跑步记录等功能可能不可用。',
        ],
      },
      {
        title: '4. 图片、文件与相册',
        body: [
          '你上传的图片仅用于识别轮廓、生成路线、生成分享图或社区内容展示。',
          '保存分享海报、二维码名片或路线封面时，我们会请求相册/媒体权限。拒绝授权不影响浏览和导航功能，但无法保存到本机相册。',
          '你可以清理应用缓存；账号注销后，我们会按产品规则删除或匿名化可识别个人的信息，法律法规另有要求的除外。',
        ],
      },
      {
        title: '5. 信息共享与第三方服务',
        body: [
          '地图、路线规划、短信、OAuth 登录、推送、对象存储等服务可能由第三方提供。我们只向其提供实现功能所必需的信息。',
          '地图服务商可能根据其规则处理定位、路线和设备网络信息；你可在应用中切换支持的地图服务商。',
          '司法机关、监管部门依法要求提供信息时，我们会按法律法规处理并尽量记录相应流程。',
        ],
      },
      {
        title: '6. 存储、保护与保留期限',
        body: [
          '我们通过访问控制、签名 token、HttpOnly Cookie、CSRF 校验、限流、日志审计和数据库权限控制保护数据。',
          '跑步位置事件、审计日志、缓存和分享资源会按配置周期清理；账号、路线、社区内容等会在你使用服务期间保留。',
          '当信息不再需要，或你依法请求删除时，我们会删除、匿名化或按法规要求保留最小必要范围。',
        ],
      },
      {
        title: '7. 你的权利',
        body: [
          '你可以访问、更正个人资料和偏好设置，清理缓存，删除分享资源，退出登录或申请注销账号。',
          '你可以通过系统权限设置关闭定位、通知、相册等权限。关闭后仅影响依赖该权限的功能。',
          '如需查询、复制、更正、删除个人信息，或撤回授权、注销账号、投诉反馈，可通过应用内反馈入口联系我们。',
        ],
      },
      {
        title: '8. 未成年人保护',
        body: [
          '未成年人使用 TraceCraft 应取得监护人同意，并在安全、合法的运动环境中使用。',
          '如监护人发现未成年人信息被不当收集或使用，可联系我们处理。',
        ],
      },
      {
        title: '9. 政策更新',
        body: [
          '我们可能因功能、法规或运营变化更新本政策。重大变化会在应用内提示。',
          '继续使用 TraceCraft 表示你已阅读并接受更新后的政策。',
        ],
      },
    ],
  },
  agreement: {
    key: 'agreement',
    title: 'TraceCraft 用户协议',
    summary: '说明你使用 TraceCraft 创建路线、导航、发布内容和参与社区时的权利、义务与安全边界。',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '1. 服务说明',
        body: [
          'TraceCraft 提供图片/模板生成跑步路线、路线预览、风险提示、实时导航、跑步记录、分享海报、模板收藏、社区发布和消息通知等功能。',
          '路线生成结果受地图数据、道路条件、定位精度、网络状态、天气、交通和用户身体状态影响，仅作为运动规划辅助，不构成安全承诺。',
        ],
      },
      {
        title: '2. 账号与登录',
        body: [
          '你可以通过微信、支付宝或手机号登录。你应保证授权信息真实、有效，并妥善保护自己的设备和账号。',
          '因你主动泄露验证码、授权凭证、设备解锁信息或账号使用权导致的风险，由你自行承担；法律另有规定除外。',
        ],
      },
      {
        title: '3. 安全运动义务',
        body: [
          '你应在合法开放、适合跑步的道路、步道、公园或运动场地使用本应用，不得进入禁区、机动车快车道、施工区域、危险水域或其他不安全区域。',
          '开始跑步前应确认身体状况、天气、交通、照明、路线风险和当地规定。跑步过程中应遵守交通规则，注意周边环境，不应因查看手机影响安全。',
          '对于高风险路线、无法验证可跑性的路线或定位精度不足的情况，应用可能阻断或提示确认。你不应绕过风险提示强行开始危险运动。',
        ],
      },
      {
        title: '4. 用户内容规范',
        body: [
          '你对上传图片、路线作品、文字、评论、头像、昵称和分享内容负责，并保证拥有必要权利或授权。',
          '不得发布违法、侵权、暴力、色情、仇恨、骚扰、诈骗、广告垃圾、泄露隐私、危害公共安全或诱导危险运动的内容。',
          '我们可根据法律法规、社区规则或投诉举报，对违规内容采取下架、限流、删除、冻结账号、保留证据等措施。',
        ],
      },
      {
        title: '5. 费用与第三方服务',
        body: [
          'TraceCraft 当前基础功能可免费使用。未来如推出付费功能，会在购买前明确展示价格、权益、期限和退款规则。',
          '地图、短信、OAuth、推送、云存储等第三方服务由对应服务商提供，可能受其服务条款和隐私规则约束。',
        ],
      },
      {
        title: '6. 知识产权',
        body: [
          'TraceCraft 的软件、界面、代码、图标、品牌、模板和相关内容受法律保护。',
          '你保留对自己上传内容依法享有的权利；为提供展示、分享、生成路线、备份和社区互动功能，你授权我们在服务范围内处理和展示相关内容。',
        ],
      },
      {
        title: '7. 责任限制',
        body: [
          '在法律允许范围内，TraceCraft 不对因用户违反交通规则、忽视风险提示、身体不适、第三方地图错误、网络中断、设备故障或不可抗力造成的损失承担超出法定范围的责任。',
          '我们会尽力维护服务稳定，但不保证服务永不中断、路线绝对准确或所有城市道路均可跑。',
        ],
      },
      {
        title: '8. 协议变更与终止',
        body: [
          '我们可能因产品、法规或运营变化更新本协议。重大变化会在应用内提示。',
          '你可随时停止使用服务或申请注销账号；若你严重违反协议或法律法规，我们可依法限制或终止服务。',
        ],
      },
    ],
  },
  permissions: {
    key: 'permissions',
    title: 'TraceCraft 权限使用说明',
    summary: '说明上架审核常见权限用途：定位、通知、相册/媒体、相机、网络和后台运行。',
    updatedAt: UPDATED_AT,
    sections: [
      {
        title: '定位权限',
        body: [
          '使用场景：获取当前位置作为路线起点、计算起点距离、开始导航、记录跑步轨迹、判断是否偏离路线、生成完成报告。',
          '权限范围：仅在你主动使用路线生成、路线预览、导航或跑步记录功能时调用。后台定位只在你主动开始导航后继续工作，结束跑步后停止。',
          '拒绝影响：无法获取当前位置、无法实时导航、无法记录实际跑步轨迹，也可能无法完成路线风险判断。',
        ],
      },
      {
        title: '通知权限',
        body: [
          '使用场景：发送跑步偏离提醒、路线生成完成通知、社区互动通知、系统消息和账号安全提示。',
          '拒绝影响：不会影响路线生成和导航主流程，但你可能错过后台任务结果、社区互动和安全提醒。',
        ],
      },
      {
        title: '相册/媒体权限',
        body: [
          '使用场景：选择图片生成跑步路线、上传社区图片、保存分享海报、保存二维码名片或路线封面。',
          '拒绝影响：无法从本机选择图片或保存图片到相册；模板生成路线、浏览内容和账号设置仍可使用。',
        ],
      },
      {
        title: '相机权限',
        body: [
          '使用场景：未来用于拍摄图片并直接生成路线、扫描跑者名片二维码或上传反馈截图。',
          '拒绝影响：无法使用拍摄或扫码功能；你仍可通过相册选择图片或手动输入信息。',
        ],
      },
      {
        title: '网络权限',
        body: [
          '使用场景：登录、验证码、地图加载、路线规划、图片上传、社区互动、消息通知、分享图生成和数据同步。',
          '拒绝影响：大多数在线功能不可用；已缓存的部分内容可能仍可查看。',
        ],
      },
      {
        title: '后台运行与运动记录',
        body: [
          '使用场景：在你开始导航后，应用可能需要在锁屏或切到后台时继续记录跑步轨迹并提供偏离提醒。',
          '控制方式：你可以通过结束跑步、退出导航、关闭定位权限或系统后台权限停止相关能力。',
        ],
      },
      {
        title: '权限最小化原则',
        body: [
          '我们只在功能需要时请求权限，不会因为你拒绝非必要权限而阻止使用无关功能。',
          '你可以在系统设置中随时关闭授权；关闭后，对应功能可能受限。',
        ],
      },
    ],
    },
  },
  en: {
    privacy: {
      key: 'privacy',
      title: 'TraceCraft Privacy Policy',
      summary: 'Explains how we collect, use, store, share, and protect your personal information, and how you can manage your data.',
      updatedAt: UPDATED_AT,
      sections: [
        {
          title: '1. Information We Collect',
          body: [
            'Account information: when you sign in with WeChat, Alipay, or phone number, we store identifiers, display name, avatar, and related account data needed to create and recognize your account.',
            'Running and route information: to generate and navigate routes, we process selected templates, uploaded images, target distance, start and end points, route points, run sessions, location points, speed, distance, deviation state, and completion records.',
            'Device and operation information: we may record device type, OS version, app version, network state, error logs, request time, IP address, and required security audit information to keep the service stable and secure.',
            'Community and interaction information: when you post works, comment, like, favorite, follow, report, or upload community images, we store the relevant content and interaction records.',
          ],
        },
        {
          title: '2. How We Use Information',
          body: [
            'To provide core features, including image/template route generation, route preview, risk notices, real-time navigation, deviation alerts, run records, share cards, QR runner cards, and community display.',
            'For account and security purposes, including session maintenance, verification code checks, abnormal request detection, rate limiting, CSRF protection, audit logs, and necessary risk control.',
            'To improve experience, including remembering language, distance unit, map provider, navigation preferences, cache state, and frequently used templates.',
            'We do not sell your personal information, and we do not use precise location data for advertising unrelated to TraceCraft core features without authorization or other legal basis.',
          ],
        },
        {
          title: '3. Location and Running Routes',
          body: [
            'Location permission is used only when you create a route, preview the start point, start navigation, upload running location, or view run results.',
            'Background location is used only after you actively start navigation, so the app can continue recording your route, deviation alerts, and completion report. After you stop or finish the run, we no longer continuously collect location.',
            'You can disable location permission in system settings. If disabled, route generation, live navigation, deviation alerts, and run records may not work.',
          ],
        },
        {
          title: '4. Images, Files, and Photos',
          body: [
            'Uploaded images are used to detect outlines, generate routes, create share images, or display community content.',
            'When saving share cards, QR runner cards, or route covers, we may request photo/media permission. Declining does not affect browsing or navigation, but images cannot be saved to your device album.',
            'You can clear app cache. After account deletion, we delete or anonymize personally identifiable information according to product rules, except where laws require otherwise.',
          ],
        },
        {
          title: '5. Sharing and Third-Party Services',
          body: [
            'Map, route planning, SMS, OAuth login, push notification, and object storage services may be provided by third parties. We provide only the information necessary for those services.',
            'Map providers may process location, route, and device network information under their own rules. You can switch supported map providers in the app.',
            'If judicial or regulatory authorities lawfully require information, we will process the request according to applicable laws and keep records where possible.',
          ],
        },
        {
          title: '6. Storage, Protection, and Retention',
          body: [
            'We protect data through access control, signed tokens, HttpOnly cookies, CSRF validation, rate limiting, audit logs, and database permission controls.',
            'Running location events, audit logs, cache, and share resources are cleaned according to configured retention periods. Account, route, and community content are retained while you use the service.',
            'When information is no longer needed, or when you legally request deletion, we delete, anonymize, or retain only the minimum required scope under law.',
          ],
        },
        {
          title: '7. Your Rights',
          body: [
            'You can access and correct profile and preference settings, clear cache, delete share resources, log out, or request account deletion.',
            'You can disable location, notification, photo, and other permissions in system settings. This only affects features that depend on those permissions.',
            'To access, copy, correct, delete personal information, withdraw authorization, delete your account, or submit complaints, contact us through the in-app feedback entry.',
          ],
        },
        {
          title: '8. Protection of Minors',
          body: [
            'Minors should use TraceCraft with guardian consent and in a safe, lawful exercise environment.',
            'If a guardian finds that a minor’s information was collected or used improperly, contact us for handling.',
          ],
        },
        {
          title: '9. Updates',
          body: [
            'We may update this policy due to feature, legal, or operational changes. Material changes will be shown in the app.',
            'Continued use of TraceCraft means you have read and accepted the updated policy.',
          ],
        },
      ],
    },
    agreement: {
      key: 'agreement',
      title: 'TraceCraft Terms of Service',
      summary: 'Explains your rights, obligations, and safety boundaries when using TraceCraft to create routes, navigate, publish content, and join the community.',
      updatedAt: UPDATED_AT,
      sections: [
        {
          title: '1. Service Description',
          body: [
            'TraceCraft provides image/template route generation, route preview, risk notices, real-time navigation, run records, share cards, template favorites, community posts, and notifications.',
            'Generated routes are affected by map data, road conditions, GPS accuracy, network state, weather, traffic, and your physical condition. They are planning aids and not safety guarantees.',
          ],
        },
        {
          title: '2. Account and Login',
          body: [
            'You may sign in with WeChat, Alipay, or phone number. You should keep authorization information valid and protect your device and account.',
            'Risks caused by voluntarily disclosing verification codes, authorization credentials, device unlock information, or account access are your responsibility unless laws provide otherwise.',
          ],
        },
        {
          title: '3. Safe Exercise Obligations',
          body: [
            'You must use the app only on legally open roads, paths, parks, or exercise venues suitable for running, and must not enter restricted areas, motor vehicle lanes, construction zones, dangerous waters, or other unsafe areas.',
            'Before running, check your physical condition, weather, traffic, lighting, route risks, and local rules. While running, follow traffic rules, watch your surroundings, and do not let phone use affect safety.',
            'For high-risk routes, unverifiable routes, or low-accuracy location states, the app may block navigation or require confirmation. You should not bypass risk notices to start unsafe exercise.',
          ],
        },
        {
          title: '4. User Content Rules',
          body: [
            'You are responsible for uploaded images, route works, text, comments, avatar, nickname, and shared content, and must have necessary rights or authorization.',
            'Do not publish illegal, infringing, violent, pornographic, hateful, harassing, fraudulent, spam, privacy-leaking, public-safety-threatening, or dangerous-exercise-inducing content.',
            'We may remove, restrict, delete, freeze accounts, or preserve evidence for violating content according to laws, community rules, or complaints.',
          ],
        },
        {
          title: '5. Fees and Third-Party Services',
          body: [
            'TraceCraft basic features are currently free. If paid features are introduced, price, benefits, duration, and refund rules will be shown before purchase.',
            'Map, SMS, OAuth, push, and cloud storage services are provided by corresponding third parties and may be subject to their terms and privacy rules.',
          ],
        },
        {
          title: '6. Intellectual Property',
          body: [
            'TraceCraft software, UI, code, icons, brand, templates, and related content are protected by law.',
            'You retain lawful rights to your uploaded content. To provide display, sharing, route generation, backup, and community interaction features, you authorize us to process and display related content within the service scope.',
          ],
        },
        {
          title: '7. Limitation of Liability',
          body: [
            'To the extent permitted by law, TraceCraft is not liable beyond statutory scope for losses caused by traffic-rule violations, ignored risk notices, physical discomfort, third-party map errors, network interruption, device failure, or force majeure.',
            'We try to keep the service stable, but we do not guarantee uninterrupted service, absolutely accurate routes, or runnable roads in every city.',
          ],
        },
        {
          title: '8. Changes and Termination',
          body: [
            'We may update these terms due to product, legal, or operational changes. Material changes will be shown in the app.',
            'You may stop using the service or request account deletion at any time. If you seriously violate these terms or laws, we may lawfully restrict or terminate service.',
          ],
        },
      ],
    },
    permissions: {
      key: 'permissions',
      title: 'TraceCraft Permission Notice',
      summary: 'Explains common app-store review permission uses: location, notifications, photos/media, camera, network, and background activity.',
      updatedAt: UPDATED_AT,
      sections: [
        {
          title: 'Location Permission',
          body: [
            'Use cases: get current location as route start point, calculate start distance, start navigation, record running route, detect route deviation, and generate completion report.',
            'Scope: called only when you actively use route generation, route preview, navigation, or run record features. Background location continues only after you actively start navigation and stops after the run ends.',
            'If denied: current location, real-time navigation, actual route recording, and route risk checks may be unavailable.',
          ],
        },
        {
          title: 'Notification Permission',
          body: [
            'Use cases: route deviation alerts, route generation completion notices, community interaction notices, system messages, and account security reminders.',
            'If denied: route generation and navigation still work, but you may miss background task results, community interactions, and security reminders.',
          ],
        },
        {
          title: 'Photos / Media Permission',
          body: [
            'Use cases: choose images to generate running routes, upload community images, save share cards, save QR runner cards, or save route covers.',
            'If denied: you cannot choose local images or save images to the device album. Template route generation, browsing, and account settings remain available.',
          ],
        },
        {
          title: 'Camera Permission',
          body: [
            'Use cases: future support for taking a photo to generate a route, scanning runner-card QR codes, or uploading feedback screenshots.',
            'If denied: shooting and scanning features are unavailable, but you can still choose images from the album or enter information manually.',
          ],
        },
        {
          title: 'Network Permission',
          body: [
            'Use cases: login, verification codes, map loading, route planning, image upload, community interaction, notifications, share image generation, and data sync.',
            'If denied: most online features are unavailable; some cached content may still be viewable.',
          ],
        },
        {
          title: 'Background Activity and Run Recording',
          body: [
            'Use cases: after you start navigation, the app may need to continue recording the running route and sending deviation alerts when locked or in background.',
            'Control: you can stop this by ending the run, exiting navigation, disabling location permission, or changing system background permissions.',
          ],
        },
        {
          title: 'Permission Minimization',
          body: [
            'We request permissions only when a feature needs them. Declining a non-essential permission will not block unrelated features.',
            'You can revoke permissions in system settings at any time; dependent features may be limited afterward.',
          ],
        },
      ],
    },
  },
};

export function getLocalLegalDocument(key: LegalDocumentKey, language: Language = 'cn'): LegalDocument {
  return legalDocumentsByLanguage[language]?.[key] || legalDocumentsByLanguage.cn[key];
}

export function publicContentToLegalDocument(key: LegalDocumentKey, content: PublicContentItem): LegalDocument {
  return {
    key,
    title: content.title,
    summary: content.summary,
    updatedAt: content.updatedAt || UPDATED_AT,
    sections: content.body.split(/\n{2,}/).map((paragraph, index) => ({
      title: index === 0 ? content.title : '',
      body: [paragraph],
    })),
  };
}
