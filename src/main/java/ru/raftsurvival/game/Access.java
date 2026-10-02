package ru.raftsurvival.game;

public enum Access {
	PUBLIC("Публичный"), PRIVATE("Закрытый (по приглашению)"), PASSWORD("По паролю");

	public final String label;

	Access(String label) {
		this.label = label;
	}
}
