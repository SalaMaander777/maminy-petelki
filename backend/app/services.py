from sqlmodel import Session

from .defaults import DEFAULT_SETTINGS
from .models import SiteSettings
from .schemas import SettingsModel


def load_settings(s: Session) -> SettingsModel:
    row = s.get(SiteSettings, 1)
    data = dict(DEFAULT_SETTINGS)
    if row:
        data.update(row.data)
    return SettingsModel.model_validate(data)


def save_settings(s: Session, value: SettingsModel) -> SettingsModel:
    row = s.get(SiteSettings, 1)
    payload = value.model_dump(mode="json")
    if row is None:
        row = SiteSettings(id=1, data=payload)
    else:
        row.data = payload
    s.add(row)
    s.commit()
    return value
