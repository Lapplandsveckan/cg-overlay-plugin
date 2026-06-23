import React from 'react';
import styles from './BubbleWatermark.module.css';

export const BubbleWatermark: React.FC<{ className?: string }> = ({ className }) => (
    <img
        className={`${styles.base} ${className ?? styles.watermark}`}
        src="/images/bubble.png"
        alt=""
        aria-hidden="true"
    />
);
