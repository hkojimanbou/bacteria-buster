import React from 'react';

interface TrainingGuideProps {
  type: 'autoThoughtCatch' | 'cognitiveRestructuring';
  isOpen: boolean;
}

export function TrainingGuide({ type, isOpen }: TrainingGuideProps) {
  if (!isOpen) return null;

  const guideContent = {
    autoThoughtCatch: (
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <div>
          <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">【目的と基本の取り組み方】</h4>
          <p>感情がざわついた時に条件反射的に湧き上がる「自動思考」に気づき、頭の中で癒着している「事実」と「解釈」、「感情」、「身体反応」、「行動」を切り分けて扱うためのトレーニングです。</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>タイミング</strong>: 感情がざわついて一連の行動が終わった直後、またはその日の夜に行います。</li>
            <li><strong>頻度</strong>: 週に3〜4回（または毎日1回）を目安に取り組みます。</li>
            <li>※保存された履歴で、通算回数や日付を確認できます。</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">※補足事項</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>STEP2〜5を書くのが面倒な時やお手上げな時は、まとめて書くか、ストレスレベル（0〜10の数値）を選ぶだけでもOKです。</li>
            <li><strong>普段意識すること</strong>: 絵文字やスタンプ、擬態語、インスタント言語（うざい、えぐい、草など）は使わず、言葉を使って細分化し、言語化するよう意識してください。</li>
          </ul>
        </div>
      </div>
    ),
    cognitiveRestructuring: (
      <div className="space-y-4 text-sm text-gray-700 leading-relaxed">
        <div>
          <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">【目的と基本の取り組み方】</h4>
          <p>自動思考キャッチトレーニングで捕まえた思考パターンの中で、特に感情のざわつきが大きいものや、よく繰り返している偏った考えを深掘りし、現実的で柔軟な考え方に再構成するトレーニングです。</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><strong>頻度</strong>: 週に1〜2回程度を目安に取り組みます。</li>
            <li>※保存された履歴で、累計回数や日付を確認できます。</li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">【全体を通したアドバイス】</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>AIの活用</strong>: リライト（部分否定文の作成）や反証出しなどで言葉が出てこない時は、ChatGPTなどのAIに手伝ってもらっても構いません。ただし、AIが出した言葉の中から「自分自身で納得感を持てるもの」を選ぶことが重要です。</li>
            <li><strong>完璧主義を手放す</strong>: 全ての項目を完璧に埋めようとせず、30分以上時間をかけないでください。途中の状態や点数が低くてもコミュニティに投稿し、できない自分をさらけ出して助けを求める（フィードバックをもらう）練習として活用してください。</li>
          </ul>
        </div>
      </div>
    )
  };

  return (
    <div className="mb-6 mt-3 glass-card p-5 animate-fade-in border border-white/50">
      {guideContent[type]}
    </div>
  );
}

