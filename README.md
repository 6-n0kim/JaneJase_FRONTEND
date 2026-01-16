# JaneJase Frontend (자네자세 프론트엔드)

**자네자세** 프로젝트의 프론트엔드입니다. 웹캠을 통해 사용자의 자세를 실시간으로 분석하고 시각화하는 웹 애플리케이션입니다. React와 MediaPipe를 활용하여 별도의 설치 없이 브라우저에서 바로 동작합니다.

## 🛠 기술 스택 (Tech Stack)

### Core Framework

- **Runtime**: Node.js
- **Build Tool**: [Vite](https://vitejs.dev/) (빠른 HMR 및 빌드 성능)
- **Framework**: [React 19](https://react.dev/) (최신 기능 활용)
- **Language**: TypeScript

### AI & Graphics

- **Computer Vision**: [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) (브라우저 내 실시간 포즈 추론)
- **3D Visualization**: [Three.js](https://threejs.org/) (3D 스켈레톤/캐릭터 렌더링)
- **Animation**: `requestAnimationFrame` 기반의 최적화된 렌더링 루프

### State & Data

- **State Management**: [Zustand](https://github.com/pmndrs/zustand) (전역 상태 관리)
- **Data Fetching**: [TanStack Query (React Query)](https://tanstack.com/query) (서버 데이터 캐싱 및 동기화)
- **Routing**: React Router v7

### Styling

- **CSS Framework**: [Tailwind CSS](https://tailwindcss.com/)
- **Icons**: Lucide React / Material Symbols

---

## 📂 소스 구조 (Source Structure)

`src/` 디렉토리 위주의 구조입니다.

```bash
JaneJase_FRONTEND/
├── src/
│   ├── assets/       # 이미지, 아이콘 등 정적 자원
│   ├── components/   # 재사용 가능한 UI 컴포넌트 (Button, Modal 등)
│   ├── hooks/        # 커스텀 훅 (비즈니스 로직 캡슐화)
│   ├── pages/        # 라우트 페이지 (Auth, Home, Pose 등)
│   ├── stores/       # Zustand 스토어 (User, Pose 상태)
│   ├── styles/       # 전역 스타일 (globals.css)
│   ├── types/        # TypeScript 타입 정의
│   ├── utils/        # 유틸리티 함수 (좌표 계산 등)
│   ├── App.tsx       # 라우터 설정 및 레이아웃
│   └── main.tsx      # Entry Point
├── index.html        # HTML 템플릿
└── package.json      # 의존성 목록
```

### 📁 주요 디렉토리 설명

- **pages/Pose**: 자세 측정 및 대시보드 관련 핵심 페이지들이 모여 있습니다. (`PoseWebcamPage`, `DashboardPage` 등)
- **components/common**: 버튼, 입력 필드 등 공통 UI 요소가 위치합니다.
- **utils/detectPose**: MediaPipe 데이터 기반의 기하학적 계산(각도, 거리) 로직이 포함됩니다. (Frontend 핵심 로직)

---

## 🌊 기본적인 소스 플로우 (Basic Source Flow)

1. **Page Load**: `PoseWebcamPage` 접속 시 웹캠 권한 요청.
2. **Initialization**: MediaPipe `PoseLandmarker` 모델 비동기 로드 (WASM/GPU).
3. **Detection Loop**:
   - `requestAnimationFrame`을 통해 매 프레임마다 영상 분석.
   - 33개의 3D 랜드마크 좌표(x, y, z) 추출.
4. **Data Processing**:
   - `utils/detectPose` 로직을 통해 거북목/어깨 비대칭 등 판별.
   - 현재 자세 데이터와 "정자세(Standard)" 데이터 비교.
5. **Visualization**:
   - 2D Canvas 오버레이 및 Three.js 3D 모델 업데이트.
6. **Interaction**:
   - 특정 시간 이상 나쁜 자세 유지 시 알림 발생 및 백엔드로 이벤트 전송.

---

## 🚀 동작 방법 (How to Run)

### 1. 환경 설정 (Prerequisites)

- [Node.js](https://nodejs.org/) (LTS 버전 권장)
- npm

### 2. 설치 (Installation)

```bash
# 의존성 설치
npm install
```

### 3. 개발 서버 실행 (Run Dev)

```bash
npm run dev
```

- 브라우저에서 `http://localhost:5173` 접속.

### 4. 빌드 (Build)

```bash
npm run build
# 미리보기
npm run preview
```

---

## 🔑 주요 기능 설명 (Key Features)

### 1. 실시간 자세 측정 및 교정 (Pose Estimation)

- 웹캠을 거울처럼 보며 자신의 자세를 실시간으로 확인.
- 거북목, 어깨 높낮이, 척추 기울기 등을 시각적으로 피드백.

### 2. 초기 정자세 설정 (Calibration)

- 사용자마다 다른 체형을 고려하여, 올바른 자세를 10초간 측정해 '기준점'으로 삼습니다.
- 이를 통해 개인화된 맞춤형 교정 솔루션을 제공합니다.

### 3. 3D 시각화

- 내 자세를 3D 캐릭터(마네킹)로 매핑하여 다각도에서 내 모습을 확인할 수 있습니다.

### 4. 대시보드

- 측정된 데이터를 그래프와 통계로 시각화하여 자세 개선 추이를 트래킹합니다.

---

## 🎨 스타일링 관리 (Styling)

- **Tailwind CSS**를 주력으로 사용합니다.
- 복잡한 애니메이션이나 특수 효과는 `src/styles/globals.css` 내의 커스텀 클래스나 인라인 스타일을 활용합니다.
- 다크 모드/라이트 모드 대응을 위해 Tailwind의 `dark:` 클래스를 활용합니다.

---

## 📝 개발 가이드 (Development Guide)

1. **컴포넌트 개발**: 가능한 잘게 쪼개어 `components/` 폴더에 위치시키고 재사용성을 높입니다.
2. **비동기 데이터**: 서버 통신은 React Query를 사용하여 캐싱 및 로딩 상태를 관리합니다.
3. **성능 최적화**: 영상 처리 루프(`requestAnimationFrame`) 내에서는 무거운 연산을 최소화하고 메모리 누수를 방지해야 합니다. (useRef 활용 권장)
